import { z } from 'zod';

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

// ============================================================================
// Credentials Schemas
// ============================================================================

export const credentialsSchema = z.object({
    privateKey: z.string()
        .min(64, 'Private key must be at least 64 characters')
        .regex(/^(0x)?[a-fA-F0-9]+$/, 'Invalid private key format'),
});

export const apiCredentialsSchema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    apiSecret: z.string().min(1, 'API secret is required'),
    passphrase: z.string().min(1, 'Passphrase is required'),
});

// ============================================================================
// Strategy Schemas
// ============================================================================

export const strategySchema = z.object({
    name: z.string()
        .min(3, 'Name must be at least 3 characters')
        .max(100, 'Name must be less than 100 characters'),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    code: z.string()
        .min(50, 'Strategy code must be at least 50 characters')
        .max(102400, 'Strategy code must be less than 100KB'),
    parameters: z.record(z.unknown()).optional(),
    marketIds: z.array(z.string()).optional(),
    schedule: z.string()
        .regex(/^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/, 'Invalid cron expression')
        .optional()
        .nullable(),
    isActive: z.boolean().optional(),
});

export const strategyUpdateSchema = strategySchema.partial();

export const strategyRunSchema = z.object({
    mode: z.enum(['PAPER', 'LIVE', 'SHADOW']),
    parameters: z.record(z.unknown()).optional(),
});

// ============================================================================
// Trading Schemas
// ============================================================================

export const tradingModeSchema = z.enum(['PAPER', 'LIVE', 'SHADOW']);

export const orderSideSchema = z.enum(['BUY', 'SELL']);

export const orderTypeSchema = z.enum(['MARKET', 'LIMIT', 'GTC', 'GTD', 'FOK', 'FAK']);

export const orderRequestSchema = z.object({
    marketId: z.string().min(1, 'Market ID is required'),
    tokenId: z.string().min(1, 'Token ID is required'),
    side: orderSideSchema,
    type: orderTypeSchema,
    size: z.number().positive('Size must be positive'),
    price: z.number().positive('Price must be positive').max(1, 'Price cannot exceed 1').optional(),
    mode: tradingModeSchema.optional(),
});

export const cancelOrderSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
});

// ============================================================================
// Risk Management Schemas
// ============================================================================

export const riskConfigSchema = z.object({
    maxOrdersPerMinute: z.number().int().min(1).max(100),
    maxDailyLoss: z.number().positive().max(1000000),
    maxPositionSize: z.number().positive().max(100000),
    maxTotalExposure: z.number().positive().max(1000000),
    killSwitchActive: z.boolean().optional(),
});

// ============================================================================
// Market Schemas
// ============================================================================

export const marketFilterSchema = z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    active: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
    sortBy: z.enum(['volume', 'liquidity', 'endDate', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ============================================================================
// Pagination Schemas
// ============================================================================

export const paginationSchema = z.object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
});

// ============================================================================
// Type Exports
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type ApiCredentialsInput = z.infer<typeof apiCredentialsSchema>;
export type StrategyInput = z.infer<typeof strategySchema>;
export type StrategyUpdateInput = z.infer<typeof strategyUpdateSchema>;
export type StrategyRunInput = z.infer<typeof strategyRunSchema>;
export type TradingMode = z.infer<typeof tradingModeSchema>;
export type OrderSide = z.infer<typeof orderSideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type OrderRequest = z.infer<typeof orderRequestSchema>;
export type RiskConfigInput = z.infer<typeof riskConfigSchema>;
export type MarketFilter = z.infer<typeof marketFilterSchema>;
