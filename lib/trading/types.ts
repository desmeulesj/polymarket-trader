import { TradingMode, OrderSide, OrderType, OrderStatus } from '@/lib/types';

// ============================================================================
// Trading Types
// ============================================================================

export interface BrokerConfig {
    mode: TradingMode;
    userId: string;
    slippageModel?: SlippageModel;
    feeRate?: number;
}

export interface OrderRequest {
    marketId: string;
    tokenId: string;
    marketTitle?: string;
    outcome?: string;
    side: OrderSide;
    type: OrderType;
    size: number;
    price?: number;
}

export interface OrderResult {
    id: string;
    success: boolean;
    status: OrderStatus;
    filledSize: number;
    filledPrice?: number;
    fees: number;
    slippage?: number;
    error?: string;
    externalId?: string;
}

export interface PositionInfo {
    marketId: string;
    tokenId: string;
    marketTitle?: string;
    outcome?: string;
    size: number;
    avgEntryPrice: number;
    currentPrice?: number;
    realizedPnl: number;
    unrealizedPnl: number;
}

export interface MarketState {
    marketId: string;
    tokenId: string;
    bid: number;
    ask: number;
    midpoint: number;
    spread: number;
    volume: number;
    lastPrice?: number;
}

export interface BrokerBalance {
    available: number;
    inOrders: number;
    inPositions: number;
    total: number;
    currency: string;
}

// ============================================================================
// Slippage Models
// ============================================================================

export type SlippageModel = 'none' | 'fixed' | 'proportional' | 'realistic';

export interface SlippageConfig {
    model: SlippageModel;
    fixedPercent?: number;     // For 'fixed' model
    proportionalFactor?: number; // For 'proportional' model
    realisticParams?: {
        impactFactor: number;
        spreadMultiplier: number;
    };
}

export function calculateSlippage(
    orderSize: number,
    marketPrice: number,
    marketLiquidity: number,
    config: SlippageConfig
): number {
    switch (config.model) {
        case 'none':
            return 0;

        case 'fixed':
            return marketPrice * (config.fixedPercent || 0.001);

        case 'proportional':
            // Slippage proportional to order size vs liquidity
            const factor = config.proportionalFactor || 0.01;
            return marketPrice * factor * (orderSize / (marketLiquidity || 1));

        case 'realistic':
            // More complex model considering multiple factors
            const params = config.realisticParams || { impactFactor: 0.1, spreadMultiplier: 1.5 };
            const sizeImpact = Math.sqrt(orderSize / (marketLiquidity || 1)) * params.impactFactor;
            return marketPrice * Math.min(sizeImpact, 0.1); // Cap at 10%

        default:
            return 0;
    }
}

// ============================================================================
// Fee Calculation
// ============================================================================

export const DEFAULT_MAKER_FEE_BPS = 0;   // 0%
export const DEFAULT_TAKER_FEE_BPS = 60;  // 0.6%

export function calculateFees(
    size: number,
    price: number,
    isMaker: boolean
): number {
    const feeBps = isMaker ? DEFAULT_MAKER_FEE_BPS : DEFAULT_TAKER_FEE_BPS;
    return (size * price * feeBps) / 10000;
}

// ============================================================================
// Broker Interface
// ============================================================================

export interface Broker {
    readonly mode: TradingMode;
    readonly userId: string;

    /**
     * Place an order
     */
    placeOrder(order: OrderRequest): Promise<OrderResult>;

    /**
     * Cancel an order
     */
    cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }>;

    /**
     * Cancel all orders
     */
    cancelAllOrders(): Promise<{ cancelled: number; failed: number }>;

    /**
     * Get open orders
     */
    getOpenOrders(): Promise<OrderResult[]>;

    /**
     * Get positions
     */
    getPositions(): Promise<PositionInfo[]>;

    /**
     * Get balance
     */
    getBalance(): Promise<BrokerBalance>;

    /**
     * Get market state (prices, etc)
     */
    getMarketState(tokenId: string): Promise<MarketState>;

    /**
     * Check if trading is allowed
     */
    canTrade(): Promise<{ allowed: boolean; reason?: string }>;
}

// ============================================================================
// Factory Function
// ============================================================================

export type BrokerFactory = (config: BrokerConfig) => Broker;
