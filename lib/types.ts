// Type definitions for trading modes and order types
// These are defined locally to avoid issues with Prisma client generation timing

export type TradingMode = 'PAPER' | 'LIVE' | 'SHADOW';
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'GTC' | 'GTD' | 'FOK' | 'FAK';
export type OrderStatus = 'PENDING' | 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'FAILED' | 'EXPIRED';
export type StrategyStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type StrategyTrigger = 'MANUAL' | 'CRON' | 'WEBHOOK';
export type AuditCategory = 'AUTH' | 'TRADING' | 'STRATEGY' | 'RISK' | 'SYSTEM' | 'SETTINGS';
