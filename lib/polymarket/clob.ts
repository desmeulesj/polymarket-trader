import {
    OrderBook,
    Price,
    Order,
    OrderRequest,
    OrderResult,
    CancelResult,
    PolymarketError,
    RateLimitError,
    OrderError,
} from './types';
import { generateL2Headers } from './auth';
import { withRetry } from '@/lib/utils/retry';

export interface ClobApiConfig {
    baseUrl: string;
    apiKey?: string;
    apiSecret?: string;
    passphrase?: string;
}

/**
 * Polymarket CLOB API Client
 * Handles order book data and trading operations
 */
export class ClobApi {
    private baseUrl: string;
    private apiKey?: string;
    private apiSecret?: string;
    private passphrase?: string;

    constructor(config: ClobApiConfig) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.passphrase = config.passphrase;
    }

    /**
     * Update credentials (after derivation)
     */
    setCredentials(apiKey: string, apiSecret: string, passphrase: string): void {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.passphrase = passphrase;
    }

    /**
     * Check if client has valid credentials for authenticated requests
     */
    get isAuthenticated(): boolean {
        return !!(this.apiKey && this.apiSecret && this.passphrase);
    }

    /**
     * Make an authenticated request to the CLOB API
     */
    private async request<T>(
        method: string,
        path: string,
        body?: Record<string, unknown>
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const bodyStr = body ? JSON.stringify(body) : undefined;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        // Add auth headers for authenticated endpoints
        if (this.isAuthenticated) {
            Object.assign(
                headers,
                generateL2Headers(
                    this.apiKey!,
                    this.apiSecret!,
                    this.passphrase!,
                    method,
                    path,
                    bodyStr
                )
            );
        }

        const response = await withRetry(async () => {
            const res = await fetch(url, {
                method,
                headers,
                body: bodyStr,
            });

            if (res.status === 429) {
                const retryAfter = res.headers.get('Retry-After');
                throw new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
            }

            if (!res.ok) {
                const error = await res.text();
                throw new PolymarketError(
                    `CLOB API error: ${error}`,
                    'CLOB_ERROR',
                    res.status,
                    { path, error }
                );
            }

            return res.json();
        });

        return response as T;
    }

    // ==========================================================================
    // Public Endpoints (no auth required)
    // ==========================================================================

    /**
     * Get current price for a token
     */
    async getPrice(tokenId: string): Promise<Price> {
        const data = await this.request<{ price: string; side: string }>('GET', `/price?token_id=${tokenId}`);
        return {
            mid: parseFloat(data.price),
            bid: 0, // Need order book for accurate bid/ask
            ask: 0,
            spread: 0,
        };
    }

    /**
     * Get midpoint price for a token
     */
    async getMidpoint(tokenId: string): Promise<number> {
        const data = await this.request<{ mid: string }>('GET', `/midpoint?token_id=${tokenId}`);
        return parseFloat(data.mid);
    }

    /**
     * Get order book for a token
     */
    async getOrderBook(tokenId: string): Promise<OrderBook> {
        return this.request<OrderBook>('GET', `/book?token_id=${tokenId}`);
    }

    /**
     * Get spread for a token
     */
    async getSpread(tokenId: string): Promise<{ bid: number; ask: number; spread: number }> {
        const book = await this.getOrderBook(tokenId);
        const topBid = book.bids.length > 0 ? parseFloat(book.bids[0].price) : 0;
        const topAsk = book.asks.length > 0 ? parseFloat(book.asks[0].price) : 1;
        return {
            bid: topBid,
            ask: topAsk,
            spread: topAsk - topBid,
        };
    }

    // ==========================================================================
    // Authenticated Endpoints
    // ==========================================================================

    /**
     * Place a new order
     */
    async placeOrder(order: OrderRequest): Promise<OrderResult> {
        if (!this.isAuthenticated) {
            throw new OrderError('Authentication required to place orders');
        }

        return this.request<OrderResult>('POST', '/order', {
            order: {
                tokenID: order.token_id,
                price: order.price.toString(),
                size: order.size.toString(),
                side: order.side,
                feeRateBps: order.fee_rate_bps || 0,
                nonce: order.nonce || Date.now(),
                expiration: order.expiration || 0,
            },
        });
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string): Promise<CancelResult> {
        if (!this.isAuthenticated) {
            throw new OrderError('Authentication required to cancel orders');
        }

        return this.request<CancelResult>('DELETE', '/order', {
            orderID: orderId,
        });
    }

    /**
     * Cancel all open orders
     */
    async cancelAllOrders(): Promise<CancelResult> {
        if (!this.isAuthenticated) {
            throw new OrderError('Authentication required to cancel orders');
        }

        return this.request<CancelResult>('DELETE', '/order-all');
    }

    /**
     * Get all open orders for the authenticated user
     */
    async getOpenOrders(): Promise<Order[]> {
        if (!this.isAuthenticated) {
            throw new OrderError('Authentication required to view orders');
        }

        const response = await this.request<Order[]>('GET', '/orders');
        return response;
    }

    /**
     * Get order by ID
     */
    async getOrder(orderId: string): Promise<Order> {
        if (!this.isAuthenticated) {
            throw new OrderError('Authentication required to view orders');
        }

        return this.request<Order>('GET', `/order/${orderId}`);
    }

    /**
     * Get trade history
     */
    async getTrades(limit: number = 100): Promise<{ trades: Order[] }> {
        if (!this.isAuthenticated) {
            throw new OrderError('Authentication required to view trades');
        }

        return this.request<{ trades: Order[] }>('GET', `/trades?limit=${limit}`);
    }
}
