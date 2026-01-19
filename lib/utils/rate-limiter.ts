interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

// In-memory store for rate limiting
// In production, use Vercel KV for distributed rate limiting
const stores = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter
 * For production, replace with Vercel KV implementation
 */
export function checkRateLimit(
    key: string,
    config: RateLimiterConfig = { maxRequests: 60, windowMs: 60000 }
): RateLimitResult {
    const now = Date.now();
    const store = stores.get(key);

    // Reset if window expired
    if (!store || store.resetAt <= now) {
        const resetAt = now + config.windowMs;
        stores.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: config.maxRequests - 1, resetAt };
    }

    // Check if limit exceeded
    if (store.count >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: store.resetAt };
    }

    // Increment counter
    store.count++;
    return {
        allowed: true,
        remaining: config.maxRequests - store.count,
        resetAt: store.resetAt
    };
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
    stores.delete(key);
}

/**
 * Create a rate-limited wrapper for async functions
 */
export async function withRateLimit<T>(
    key: string,
    fn: () => Promise<T>,
    config?: RateLimiterConfig
): Promise<T> {
    const result = checkRateLimit(key, config);

    if (!result.allowed) {
        const waitTime = result.resetAt - Date.now();
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    return fn();
}

// ============================================================================
// Per-User Rate Limiting
// ============================================================================

export function createUserRateLimiter(config: RateLimiterConfig) {
    return {
        check: (userId: string): RateLimitResult => {
            return checkRateLimit(`user:${userId}`, config);
        },
        reset: (userId: string): void => {
            resetRateLimit(`user:${userId}`);
        },
    };
}

// ============================================================================
// Per-Endpoint Rate Limiting
// ============================================================================

export const endpointLimits = {
    // Trading endpoints - stricter limits
    orders: { maxRequests: 30, windowMs: 60000 },
    strategies: { maxRequests: 60, windowMs: 60000 },

    // Read endpoints - more generous
    markets: { maxRequests: 120, windowMs: 60000 },
    positions: { maxRequests: 60, windowMs: 60000 },

    // Auth endpoints - strict
    auth: { maxRequests: 10, windowMs: 60000 },
};

export function checkEndpointRateLimit(
    endpoint: keyof typeof endpointLimits,
    userId: string
): RateLimitResult {
    const config = endpointLimits[endpoint];
    return checkRateLimit(`${endpoint}:${userId}`, config);
}
