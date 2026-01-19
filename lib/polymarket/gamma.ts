import {
    Market,
    Event,
    PaginatedResponse,
    PolymarketError,
    RateLimitError,
} from './types';
import { withRetry } from '@/lib/utils/retry';

export interface GammaApiConfig {
    baseUrl: string;
}

export interface MarketFilters {
    slug?: string;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
    category?: string;
    limit?: number;
    offset?: number;
    order?: 'asc' | 'desc';
    ascending?: boolean;
}

export interface EventFilters {
    slug?: string;
    active?: boolean;
    closed?: boolean;
    limit?: number;
    offset?: number;
}

/**
 * Polymarket Gamma API Client
 * Handles market discovery and metadata
 */
export class GammaApi {
    private baseUrl: string;

    constructor(config: GammaApiConfig) {
        this.baseUrl = config.baseUrl;
    }

    /**
     * Make a request to the Gamma API
     */
    private async request<T>(path: string, params?: Record<string, unknown>): Promise<T> {
        const url = new URL(`${this.baseUrl}${path}`);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.set(key, String(value));
                }
            });
        }

        const response = await withRetry(async () => {
            const res = await fetch(url.toString(), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (res.status === 429) {
                const retryAfter = res.headers.get('Retry-After');
                throw new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
            }

            if (!res.ok) {
                const error = await res.text();
                throw new PolymarketError(
                    `Gamma API error: ${error}`,
                    'GAMMA_ERROR',
                    res.status,
                    { path, error }
                );
            }

            return res.json();
        });

        return response as T;
    }

    // ==========================================================================
    // Markets
    // ==========================================================================

    /**
     * Get all markets with optional filters
     */
    async getMarkets(filters: MarketFilters = {}): Promise<Market[]> {
        const params: Record<string, unknown> = {
            limit: filters.limit || 100,
            offset: filters.offset || 0,
        };

        if (filters.slug) params.slug = filters.slug;
        if (filters.active !== undefined) params.active = filters.active;
        if (filters.closed !== undefined) params.closed = filters.closed;
        if (filters.archived !== undefined) params.archived = filters.archived;
        if (filters.category) params.tag = filters.category;
        if (filters.order) params.order = filters.order;
        if (filters.ascending !== undefined) params.ascending = filters.ascending;

        return this.request<Market[]>('/markets', params);
    }

    /**
     * Get a single market by condition ID
     */
    async getMarket(conditionId: string): Promise<Market> {
        const markets = await this.request<Market[]>('/markets', { condition_id: conditionId });
        if (markets.length === 0) {
            throw new PolymarketError(
                `Market not found: ${conditionId}`,
                'NOT_FOUND',
                404
            );
        }
        return markets[0];
    }

    /**
     * Get a market by slug
     */
    async getMarketBySlug(slug: string): Promise<Market> {
        const markets = await this.request<Market[]>('/markets', { slug });
        if (markets.length === 0) {
            throw new PolymarketError(
                `Market not found: ${slug}`,
                'NOT_FOUND',
                404
            );
        }
        return markets[0];
    }

    /**
     * Search markets by query
     */
    async searchMarkets(query: string, limit: number = 20): Promise<Market[]> {
        // Gamma API doesn't have direct search, so we fetch and filter
        const markets = await this.getMarkets({ limit: 1000, active: true });
        const lowerQuery = query.toLowerCase();

        return markets
            .filter(m =>
                m.question.toLowerCase().includes(lowerQuery) ||
                m.description?.toLowerCase().includes(lowerQuery) ||
                m.slug.toLowerCase().includes(lowerQuery)
            )
            .slice(0, limit);
    }

    // ==========================================================================
    // Events
    // ==========================================================================

    /**
     * Get all events with optional filters
     */
    async getEvents(filters: EventFilters = {}): Promise<Event[]> {
        const params: Record<string, unknown> = {
            limit: filters.limit || 100,
            offset: filters.offset || 0,
        };

        if (filters.slug) params.slug = filters.slug;
        if (filters.active !== undefined) params.active = filters.active;
        if (filters.closed !== undefined) params.closed = filters.closed;

        return this.request<Event[]>('/events', params);
    }

    /**
     * Get a single event by ID
     */
    async getEvent(eventId: string): Promise<Event> {
        return this.request<Event>(`/events/${eventId}`);
    }

    /**
     * Get event by slug
     */
    async getEventBySlug(slug: string): Promise<Event> {
        const events = await this.request<Event[]>('/events', { slug });
        if (events.length === 0) {
            throw new PolymarketError(
                `Event not found: ${slug}`,
                'NOT_FOUND',
                404
            );
        }
        return events[0];
    }

    // ==========================================================================
    // Categories
    // ==========================================================================

    /**
     * Get all available categories
     * Note: Polymarket doesn't have a dedicated categories endpoint,
     * so we extract from markets
     */
    async getCategories(): Promise<string[]> {
        const markets = await this.getMarkets({ limit: 1000 });
        const categories = new Set<string>();

        markets.forEach(m => {
            if (m.category) {
                categories.add(m.category);
            }
        });

        return Array.from(categories).sort();
    }

    // ==========================================================================
    // Stats
    // ==========================================================================

    /**
     * Get market statistics
     */
    async getMarketStats(conditionId: string): Promise<{
        volume: number;
        liquidity: number;
        priceYes: number;
        priceNo: number;
    }> {
        const market = await this.getMarket(conditionId);
        const prices = market.outcome_prices ? JSON.parse(market.outcome_prices) : [];

        return {
            volume: market.volume_num || 0,
            liquidity: market.liquidity_num || 0,
            priceYes: prices[0] ? parseFloat(prices[0]) : 0.5,
            priceNo: prices[1] ? parseFloat(prices[1]) : 0.5,
        };
    }
}
