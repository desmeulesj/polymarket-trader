import {
    Position,
    Activity,
    Trade,
    PolymarketError,
    RateLimitError,
} from './types';
import { withRetry } from '@/lib/utils/retry';

export interface DataApiConfig {
    baseUrl: string;
}

/**
 * Polymarket Data API Client
 * Handles user positions, activity, and trade history
 */
export class DataApi {
    private baseUrl: string;

    constructor(config: DataApiConfig) {
        this.baseUrl = config.baseUrl;
    }

    /**
     * Make a request to the Data API
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
                    `Data API error: ${error}`,
                    'DATA_ERROR',
                    res.status,
                    { path, error }
                );
            }

            return res.json();
        });

        return response as T;
    }

    // ==========================================================================
    // Positions
    // ==========================================================================

    /**
     * Get all positions for an address
     */
    async getPositions(address: string): Promise<Position[]> {
        return this.request<Position[]>('/positions', { user: address });
    }

    /**
     * Get open positions for an address
     */
    async getOpenPositions(address: string): Promise<Position[]> {
        const positions = await this.getPositions(address);
        return positions.filter(p => !p.closed && p.size > 0);
    }

    /**
     * Get position for a specific market
     */
    async getPosition(address: string, conditionId: string): Promise<Position | null> {
        const positions = await this.getPositions(address);
        return positions.find(p => p.condition_id === conditionId) || null;
    }

    /**
     * Get position PnL summary
     */
    async getPositionSummary(address: string): Promise<{
        totalValue: number;
        totalPnl: number;
        realizedPnl: number;
        unrealizedPnl: number;
        openPositions: number;
    }> {
        const positions = await this.getOpenPositions(address);

        return positions.reduce(
            (acc, p) => ({
                totalValue: acc.totalValue + p.current_value,
                totalPnl: acc.totalPnl + p.total_pnl,
                realizedPnl: acc.realizedPnl + p.realized_pnl,
                unrealizedPnl: acc.unrealizedPnl + p.unrealized_pnl,
                openPositions: acc.openPositions + 1,
            }),
            { totalValue: 0, totalPnl: 0, realizedPnl: 0, unrealizedPnl: 0, openPositions: 0 }
        );
    }

    // ==========================================================================
    // Activity
    // ==========================================================================

    /**
     * Get activity history for an address
     */
    async getActivity(
        address: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<Activity[]> {
        return this.request<Activity[]>('/activity', {
            user: address,
            limit: options.limit || 100,
            offset: options.offset || 0,
        });
    }

    /**
     * Get recent trades for an address
     */
    async getRecentTrades(
        address: string,
        limit: number = 50
    ): Promise<Activity[]> {
        const activity = await this.getActivity(address, { limit });
        return activity.filter(a => a.type === 'BUY' || a.type === 'SELL');
    }

    // ==========================================================================
    // Trades
    // ==========================================================================

    /**
     * Get trade history for a market
     */
    async getMarketTrades(
        conditionId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<Trade[]> {
        return this.request<Trade[]>('/trades', {
            market: conditionId,
            limit: options.limit || 100,
            offset: options.offset || 0,
        });
    }

    /**
     * Get recent market trades
     */
    async getRecentMarketTrades(conditionId: string, limit: number = 50): Promise<Trade[]> {
        return this.getMarketTrades(conditionId, { limit });
    }

    // ==========================================================================
    // Historical Data
    // ==========================================================================

    /**
     * Get price history for a market (if available)
     * Note: This may require additional API endpoints
     */
    async getPriceHistory(
        conditionId: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _options: {
            startTime?: number;
            endTime?: number;
            interval?: 'minute' | 'hour' | 'day';
        } = {}
    ): Promise<Array<{ timestamp: number; price: number; volume: number }>> {
        // Polymarket doesn't have a direct price history endpoint
        // This would need to be constructed from trade history or an external data source
        const trades = await this.getMarketTrades(conditionId, { limit: 1000 });

        // Aggregate trades into time buckets
        const priceMap = new Map<number, { prices: number[]; volume: number }>();

        trades.forEach(trade => {
            const timestamp = Math.floor(new Date(trade.match_time).getTime() / 3600000) * 3600000;
            const entry = priceMap.get(timestamp) || { prices: [], volume: 0 };
            entry.prices.push(parseFloat(trade.price));
            entry.volume += parseFloat(trade.size);
            priceMap.set(timestamp, entry);
        });

        return Array.from(priceMap.entries())
            .map(([timestamp, data]) => ({
                timestamp,
                price: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
                volume: data.volume,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
    }
}
