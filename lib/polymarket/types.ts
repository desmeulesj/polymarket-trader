// ============================================================================
// Common Types
// ============================================================================

export interface PolymarketConfig {
    clobUrl: string;
    gammaUrl: string;
    dataUrl: string;
    wsUrl: string;
    privateKey?: string;
    apiKey?: string;
    apiSecret?: string;
    passphrase?: string;
}

export interface ApiResponse<T> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

export interface PaginatedResponse<T> {
    data: T[];
    next_cursor?: string;
    limit: number;
    count: number;
}

// ============================================================================
// Market Types (Gamma API)
// ============================================================================

export interface Market {
    id: string;
    condition_id: string;
    question_id: string;
    tokens: Token[];
    question: string;
    description?: string;
    category?: string;
    slug: string;
    active: boolean;
    closed: boolean;
    archived: boolean;
    accepting_orders: boolean;
    enable_order_book: boolean;
    minimum_order_size: number;
    minimum_tick_size: number;
    market_slug: string;
    outcomes: string[];
    outcome_prices: string;
    volume: number;
    volume_num: number;
    liquidity: number;
    liquidity_num: number;
    end_date_iso: string;
    game_start_time?: string;
    seconds_delay: number;
    fpmm?: string;
    maker_base_fee: number;
    taker_base_fee: number;
    notifications_enabled: boolean;
    neg_risk: boolean;
    neg_risk_market_id?: string;
    neg_risk_request_id?: string;
    icon?: string;
    image?: string;
}

export interface Token {
    token_id: string;
    outcome: string;
    price: number;
    winner: boolean;
}

export interface Event {
    id: string;
    ticker: string;
    slug: string;
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    category?: string;
    markets: Market[];
    enable_order_book: boolean;
    active: boolean;
    closed: boolean;
    archived: boolean;
    comments_enabled: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Order Book Types (CLOB API)
// ============================================================================

export interface OrderBook {
    market: string;
    asset_id: string;
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    hash?: string;
    timestamp?: string;
}

export interface OrderBookLevel {
    price: string;
    size: string;
}

export interface Price {
    mid: number;
    bid: number;
    ask: number;
    spread: number;
    last?: number;
    volume?: number;
}

export interface Midpoint {
    mid: string;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'GTC' | 'GTD' | 'FOK' | 'FAK';
export type OrderStatus = 'LIVE' | 'FILLED' | 'CANCELLED' | 'MATCHED' | 'DELAYED';

export interface OrderRequest {
    token_id: string;
    price: number;      // 0 to 1
    size: number;       // Amount to buy/sell
    side: OrderSide;
    fee_rate_bps?: number;
    nonce?: number;
    expiration?: number;
    taker_address?: string;
}

export interface Order {
    id: string;
    owner: string;
    status: OrderStatus;
    market: string;
    asset_id: string;
    side: OrderSide;
    type: OrderType;
    original_size: string;
    size_matched: string;
    price: string;
    outcome?: string;
    expiration?: number;
    created_at: string;
    updated_at?: string;
    order_id?: string;
    maker_address: string;
    associate_trades?: Trade[];
}

export interface OrderResult {
    success: boolean;
    order_id?: string;
    transaction_hash?: string;
    error_msg?: string;
    status?: OrderStatus;
}

export interface CancelResult {
    success: boolean;
    canceled: string[];
    not_canceled?: Record<string, string>;
}

// ============================================================================
// Trade Types
// ============================================================================

export interface Trade {
    id: string;
    taker_order_id: string;
    market: string;
    asset_id: string;
    side: OrderSide;
    size: string;
    fee_rate_bps: number;
    price: string;
    status: string;
    match_time: string;
    owner: string;
    outcome?: string;
    bucket_index?: number;
    transaction_hash?: string;
}

// ============================================================================
// Position Types (Data API)
// ============================================================================

export interface Position {
    asset: string;
    condition_id: string;
    market_slug: string;
    title?: string;
    outcome?: string;
    size: number;
    avg_price: number;
    current_price?: number;
    realized_pnl: number;
    unrealized_pnl: number;
    total_pnl: number;
    initial_value: number;
    current_value: number;
    cashflow: number;
    closed: boolean;
    created_at: string;
    updated_at: string;
}

export interface Activity {
    id: string;
    type: 'BUY' | 'SELL' | 'TRANSFER' | 'CLAIM';
    market_slug?: string;
    outcome?: string;
    size: string;
    price?: string;
    value?: string;
    timestamp: string;
    transaction_hash?: string;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface L2Credentials {
    apiKey: string;
    apiSecret: string;
    passphrase: string;
}

export interface DeriveApiKeyResponse {
    apiKey: string;
    secret: string;
    passphrase: string;
}

export interface SignatureType {
    type: 'EOA' | 'POLY_GNOSIS_SAFE' | 'POLY_PROXY';
    funder?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class PolymarketError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly status?: number,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'PolymarketError';
    }
}

export class RateLimitError extends PolymarketError {
    constructor(retryAfter?: number) {
        super(
            `Rate limit exceeded. Retry after ${retryAfter || 'unknown'} seconds`,
            'RATE_LIMIT',
            429,
            { retryAfter }
        );
        this.name = 'RateLimitError';
    }
}

export class AuthenticationError extends PolymarketError {
    constructor(message: string = 'Authentication failed') {
        super(message, 'AUTH_ERROR', 401);
        this.name = 'AuthenticationError';
    }
}

export class OrderError extends PolymarketError {
    constructor(message: string, details?: unknown) {
        super(message, 'ORDER_ERROR', 400, details);
        this.name = 'OrderError';
    }
}
