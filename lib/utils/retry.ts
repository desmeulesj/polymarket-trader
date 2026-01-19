interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    retryableErrors: number[];
}

const DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    retryableErrors: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Check if we should retry
            const status = (error as { status?: number }).status;
            const isRetryable = status && finalConfig.retryableErrors.includes(status);
            const hasRetriesLeft = attempt < finalConfig.maxRetries;

            if (isRetryable && hasRetriesLeft) {
                const delay = calculateDelay(attempt, finalConfig);
                console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await sleep(delay);
            } else {
                throw error;
            }
        }
    }

    throw lastError;
}

/**
 * Create a retry wrapper for async functions
 */
export function createRetryWrapper(config: Partial<RetryConfig> = {}) {
    return <T>(fn: () => Promise<T>): Promise<T> => withRetry(fn, config);
}
