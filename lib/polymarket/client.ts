import { ClobApi } from './clob';
import { GammaApi } from './gamma';
import { DataApi } from './data';
import { deriveL2Credentials, getWalletAddress } from './auth';
import {
    PolymarketConfig,
    Market,
    OrderBook,
    Order,
    OrderRequest,
    OrderResult,
    Position,
    L2Credentials,
} from './types';

export * from './types';
export * from './auth';
export { ClobApi } from './clob';
export { GammaApi } from './gamma';
export { DataApi } from './data';

/**
 * Main Polymarket API Client
 * Combines CLOB, Gamma, and Data APIs into a unified interface
 */
export class PolymarketClient {
    public readonly clob: ClobApi;
    public readonly gamma: GammaApi;
    public readonly data: DataApi;

    private privateKey?: string;
    private walletAddress?: string;
    private credentials?: L2Credentials;

    constructor(config: Partial<PolymarketConfig> = {}) {
        const clobUrl = config.clobUrl || process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com';
        const gammaUrl = config.gammaUrl || process.env.POLYMARKET_GAMMA_URL || 'https://gamma-api.polymarket.com';
        const dataUrl = config.dataUrl || process.env.POLYMARKET_DATA_URL || 'https://data-api.polymarket.com';

        this.clob = new ClobApi({
            baseUrl: clobUrl,
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            passphrase: config.passphrase,
        });

        this.gamma = new GammaApi({ baseUrl: gammaUrl });
        this.data = new DataApi({ baseUrl: dataUrl });

        if (config.privateKey) {
            this.privateKey = config.privateKey;
            this.walletAddress = getWalletAddress(config.privateKey);
        }

        if (config.apiKey && config.apiSecret && config.passphrase) {
            this.credentials = {
                apiKey: config.apiKey,
                apiSecret: config.apiSecret,
                passphrase: config.passphrase,
            };
        }
    }

    /**
     * Check if client is authenticated for trading
     */
    get isAuthenticated(): boolean {
        return this.clob.isAuthenticated;
    }

    /**
     * Get wallet address
     */
    get address(): string | undefined {
        return this.walletAddress;
    }

    /**
     * Initialize with private key and derive L2 credentials
     */
    async authenticate(privateKey: string): Promise<L2Credentials> {
        this.privateKey = privateKey;
        this.walletAddress = getWalletAddress(privateKey);

        const clobUrl = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com';
        this.credentials = await deriveL2Credentials(privateKey, clobUrl);

        this.clob.setCredentials(
            this.credentials.apiKey,
            this.credentials.apiSecret,
            this.credentials.passphrase
        );

        return this.credentials;
    }

    /**
     * Set credentials directly (if already derived)
     */
    setCredentials(credentials: L2Credentials, walletAddress?: string): void {
        this.credentials = credentials;
        this.walletAddress = walletAddress;
        this.clob.setCredentials(
            credentials.apiKey,
            credentials.apiSecret,
            credentials.passphrase
        );
    }

    // ==========================================================================
    // Markets (Gamma API)
    // ==========================================================================

    /**
     * Get active markets
     */
    async getMarkets(options: {
        active?: boolean;
        limit?: number;
        offset?: number;
        category?: string;
    } = {}): Promise<Market[]> {
        return this.gamma.getMarkets({
            active: options.active ?? true,
            limit: options.limit,
            offset: options.offset,
            category: options.category,
        });
    }

    /**
     * Get a single market
     */
    async getMarket(conditionId: string): Promise<Market> {
        return this.gamma.getMarket(conditionId);
    }

    /**
     * Search markets
     */
    async searchMarkets(query: string, limit: number = 20): Promise<Market[]> {
        return this.gamma.searchMarkets(query, limit);
    }

    // ==========================================================================
    // Order Book (CLOB API)
    // ==========================================================================

    /**
     * Get order book for a token
     */
    async getOrderBook(tokenId: string): Promise<OrderBook> {
        return this.clob.getOrderBook(tokenId);
    }

    /**
     * Get current price
     */
    async getPrice(tokenId: string): Promise<number> {
        return this.clob.getMidpoint(tokenId);
    }

    /**
     * Get spread
     */
    async getSpread(tokenId: string): Promise<{ bid: number; ask: number; spread: number }> {
        return this.clob.getSpread(tokenId);
    }

    // ==========================================================================
    // Trading (CLOB API)
    // ==========================================================================

    /**
     * Place an order
     */
    async placeOrder(order: OrderRequest): Promise<OrderResult> {
        return this.clob.placeOrder(order);
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string): Promise<void> {
        await this.clob.cancelOrder(orderId);
    }

    /**
     * Cancel all orders
     */
    async cancelAllOrders(): Promise<void> {
        await this.clob.cancelAllOrders();
    }

    /**
     * Get open orders
     */
    async getOpenOrders(): Promise<Order[]> {
        return this.clob.getOpenOrders();
    }

    // ==========================================================================
    // Positions (Data API)
    // ==========================================================================

    /**
     * Get positions for authenticated user
     */
    async getPositions(): Promise<Position[]> {
        if (!this.walletAddress) {
            throw new Error('Wallet address required to get positions');
        }
        return this.data.getPositions(this.walletAddress);
    }

    /**
     * Get open positions
     */
    async getOpenPositions(): Promise<Position[]> {
        if (!this.walletAddress) {
            throw new Error('Wallet address required to get positions');
        }
        return this.data.getOpenPositions(this.walletAddress);
    }

    /**
     * Get position summary
     */
    async getPositionSummary(): Promise<{
        totalValue: number;
        totalPnl: number;
        realizedPnl: number;
        unrealizedPnl: number;
        openPositions: number;
    }> {
        if (!this.walletAddress) {
            throw new Error('Wallet address required to get position summary');
        }
        return this.data.getPositionSummary(this.walletAddress);
    }

    // ==========================================================================
    // Activity (Data API)
    // ==========================================================================

    /**
     * Get activity history
     */
    async getActivity(limit: number = 100): Promise<unknown[]> {
        if (!this.walletAddress) {
            throw new Error('Wallet address required to get activity');
        }
        return this.data.getActivity(this.walletAddress, { limit });
    }
}

// ==========================================================================
// Factory Functions
// ==========================================================================

/**
 * Create a new Polymarket client
 */
export function createClient(config?: Partial<PolymarketConfig>): PolymarketClient {
    return new PolymarketClient(config);
}

/**
 * Create a client with authentication
 */
export async function createAuthenticatedClient(
    privateKey: string,
    config?: Partial<PolymarketConfig>
): Promise<PolymarketClient> {
    const client = new PolymarketClient(config);
    await client.authenticate(privateKey);
    return client;
}
