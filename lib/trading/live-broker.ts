import { TradingMode } from '@/lib/types';
import prisma from '@/lib/db';
import { PolymarketClient, createClient, L2Credentials } from '@/lib/polymarket/client';
import { decrypt } from '@/lib/crypto/encryption';
import { logOrderPlaced, logAudit, AuditActions } from '@/lib/audit/logger';
import {
    Broker,
    BrokerConfig,
    OrderRequest,
    OrderResult,
    PositionInfo,
    BrokerBalance,
    MarketState,
    calculateFees,
} from './types';

/**
 * Live Trading Broker
 * Executes real orders on Polymarket
 */
export class LiveBroker implements Broker {
    readonly mode: TradingMode = 'LIVE';
    readonly userId: string;

    private polymarket: PolymarketClient;
    private isInitialized: boolean = false;

    constructor(config: BrokerConfig) {
        this.userId = config.userId;
        this.polymarket = createClient();
    }

    /**
     * Initialize the broker with user credentials
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        const credentials = await prisma.credentials.findUnique({
            where: { userId: this.userId },
        });

        if (!credentials || !credentials.isConnected) {
            throw new Error('Polymarket credentials not configured');
        }

        if (!credentials.encryptedApiKey || !credentials.encryptedApiSecret || !credentials.encryptedPassphrase) {
            throw new Error('API credentials not available');
        }

        try {
            const apiKey = decrypt(credentials.encryptedApiKey);
            const apiSecret = decrypt(credentials.encryptedApiSecret);
            const passphrase = decrypt(credentials.encryptedPassphrase);

            const l2Credentials: L2Credentials = { apiKey, apiSecret, passphrase };
            this.polymarket.setCredentials(l2Credentials, credentials.walletAddress || undefined);
            this.isInitialized = true;
        } catch (error) {
            throw new Error('Failed to decrypt credentials');
        }
    }

    private ensureInitialized(): void {
        if (!this.isInitialized || !this.polymarket.isAuthenticated) {
            throw new Error('Broker not initialized. Call initialize() first.');
        }
    }

    async placeOrder(order: OrderRequest): Promise<OrderResult> {
        await this.initialize();
        this.ensureInitialized();

        // Check if trading is allowed
        const canTradeResult = await this.canTrade();
        if (!canTradeResult.allowed) {
            return {
                id: '',
                success: false,
                status: 'FAILED',
                filledSize: 0,
                fees: 0,
                error: canTradeResult.reason,
            };
        }

        // Pre-trade risk checks
        const riskCheck = await this.preTradeRiskCheck(order);
        if (!riskCheck.passed) {
            await logAudit({
                userId: this.userId,
                action: AuditActions.RISK_LIMIT_TRIGGERED,
                category: 'RISK',
                details: { order, reason: riskCheck.reason },
            });

            return {
                id: '',
                success: false,
                status: 'FAILED',
                filledSize: 0,
                fees: 0,
                error: riskCheck.reason,
            };
        }

        try {
            // Create order in database first (pending)
            const dbOrder = await prisma.order.create({
                data: {
                    userId: this.userId,
                    marketId: order.marketId,
                    tokenId: order.tokenId,
                    marketTitle: order.marketTitle,
                    outcome: order.outcome,
                    side: order.side,
                    type: order.type,
                    size: order.size,
                    price: order.price,
                    status: 'PENDING',
                    mode: 'LIVE',
                },
            });

            // Submit to Polymarket
            const result = await this.polymarket.placeOrder({
                token_id: order.tokenId,
                price: order.price || 0.5,
                size: order.size,
                side: order.side,
            });

            if (!result.success) {
                // Update order as failed
                await prisma.order.update({
                    where: { id: dbOrder.id },
                    data: { status: 'FAILED' },
                });

                return {
                    id: dbOrder.id,
                    success: false,
                    status: 'FAILED',
                    filledSize: 0,
                    fees: 0,
                    error: result.error_msg,
                };
            }

            // Update order with external ID
            const fees = calculateFees(order.size, order.price || 0.5, false);

            await prisma.order.update({
                where: { id: dbOrder.id },
                data: {
                    externalId: result.order_id,
                    status: result.status === 'FILLED' ? 'FILLED' : 'OPEN',
                    filledSize: order.size, // Will be updated by webhook/polling
                    fees,
                    filledAt: result.status === 'FILLED' ? new Date() : null,
                },
            });

            // Audit log
            await logOrderPlaced(this.userId, dbOrder.id, {
                mode: 'LIVE',
                side: order.side,
                type: order.type,
                size: order.size,
                price: order.price,
                fees,
                externalId: result.order_id,
                marketId: order.marketId,
            });

            return {
                id: dbOrder.id,
                success: true,
                status: result.status === 'FILLED' ? 'FILLED' : 'OPEN',
                filledSize: order.size,
                filledPrice: order.price,
                fees,
                externalId: result.order_id,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            await logAudit({
                userId: this.userId,
                action: AuditActions.ORDER_FAILED,
                category: 'TRADING',
                details: { order, error: errorMessage },
            });

            return {
                id: '',
                success: false,
                status: 'FAILED',
                filledSize: 0,
                fees: 0,
                error: errorMessage,
            };
        }
    }

    private async preTradeRiskCheck(order: OrderRequest): Promise<{ passed: boolean; reason?: string }> {
        const riskConfig = await prisma.riskConfig.findUnique({
            where: { userId: this.userId },
        });

        if (!riskConfig) {
            return { passed: true }; // No risk config, allow trade
        }

        // Check position size
        const orderValue = order.size * (order.price || 0.5);
        if (orderValue > riskConfig.maxPositionSize) {
            return { passed: false, reason: `Order value $${orderValue.toFixed(2)} exceeds max position size $${riskConfig.maxPositionSize}` };
        }

        // Check total exposure
        const currentPositions = await this.getPositions();
        const totalExposure = currentPositions.reduce((sum, p) =>
            sum + (p.size * (p.currentPrice || p.avgEntryPrice)), 0
        ) + orderValue;

        if (totalExposure > riskConfig.maxTotalExposure) {
            return { passed: false, reason: `Total exposure $${totalExposure.toFixed(2)} would exceed limit $${riskConfig.maxTotalExposure}` };
        }

        // Check orders per minute
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const recentOrders = await prisma.order.count({
            where: {
                userId: this.userId,
                mode: 'LIVE',
                createdAt: { gte: oneMinuteAgo },
            },
        });

        if (recentOrders >= riskConfig.maxOrdersPerMinute) {
            return { passed: false, reason: `Rate limit: ${recentOrders} orders in last minute (max: ${riskConfig.maxOrdersPerMinute})` };
        }

        return { passed: true };
    }

    async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
        await this.initialize();
        this.ensureInitialized();

        try {
            const order = await prisma.order.findFirst({
                where: { id: orderId, userId: this.userId, mode: 'LIVE' },
            });

            if (!order) {
                return { success: false, error: 'Order not found' };
            }

            if (!order.externalId) {
                return { success: false, error: 'No external order ID' };
            }

            // Cancel on Polymarket
            await this.polymarket.cancelOrder(order.externalId);

            // Update local order
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'CANCELLED', cancelledAt: new Date() },
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async cancelAllOrders(): Promise<{ cancelled: number; failed: number }> {
        await this.initialize();
        this.ensureInitialized();

        try {
            // Cancel on Polymarket
            await this.polymarket.cancelAllOrders();

            // Update local orders
            const result = await prisma.order.updateMany({
                where: {
                    userId: this.userId,
                    mode: 'LIVE',
                    status: { in: ['OPEN', 'PENDING'] },
                },
                data: { status: 'CANCELLED', cancelledAt: new Date() },
            });

            return { cancelled: result.count, failed: 0 };
        } catch {
            return { cancelled: 0, failed: 1 };
        }
    }

    async getOpenOrders(): Promise<OrderResult[]> {
        await this.initialize();
        this.ensureInitialized();

        const orders = await prisma.order.findMany({
            where: {
                userId: this.userId,
                mode: 'LIVE',
                status: { in: ['OPEN', 'PENDING', 'PARTIALLY_FILLED'] },
            },
            orderBy: { createdAt: 'desc' },
        });

        return orders.map(o => ({
            id: o.id,
            success: true,
            status: o.status,
            filledSize: o.filledSize,
            filledPrice: o.filledPrice || undefined,
            fees: o.fees,
            externalId: o.externalId || undefined,
        }));
    }

    async getPositions(): Promise<PositionInfo[]> {
        await this.initialize();

        try {
            // Get positions from Polymarket
            const positions = await this.polymarket.getOpenPositions();

            return positions.map(p => ({
                marketId: p.condition_id,
                tokenId: p.asset,
                marketTitle: p.title,
                outcome: p.outcome,
                size: p.size,
                avgEntryPrice: p.avg_price,
                currentPrice: p.current_price,
                realizedPnl: p.realized_pnl,
                unrealizedPnl: p.unrealized_pnl,
            }));
        } catch {
            // Fallback to local database
            const positions = await prisma.position.findMany({
                where: {
                    userId: this.userId,
                    mode: 'LIVE',
                    size: { gt: 0 },
                },
            });

            return positions.map(p => ({
                marketId: p.marketId,
                tokenId: p.tokenId,
                marketTitle: p.marketTitle || undefined,
                outcome: p.outcome || undefined,
                size: p.size,
                avgEntryPrice: p.avgEntryPrice,
                currentPrice: p.currentPrice || undefined,
                realizedPnl: p.realizedPnl,
                unrealizedPnl: p.unrealizedPnl,
            }));
        }
    }

    async getBalance(): Promise<BrokerBalance> {
        await this.initialize();

        try {
            const summary = await this.polymarket.getPositionSummary();

            return {
                available: 0, // Would need wallet balance API
                inOrders: 0,  // Would need open orders value
                inPositions: summary.totalValue,
                total: summary.totalValue,
                currency: 'USDC',
            };
        } catch {
            return {
                available: 0,
                inOrders: 0,
                inPositions: 0,
                total: 0,
                currency: 'USDC',
            };
        }
    }

    async getMarketState(tokenId: string): Promise<MarketState> {
        try {
            const [spread, midpoint] = await Promise.all([
                this.polymarket.getSpread(tokenId),
                this.polymarket.getPrice(tokenId),
            ]);

            return {
                marketId: '',
                tokenId,
                bid: spread.bid,
                ask: spread.ask,
                midpoint,
                spread: spread.spread,
                volume: 0,
            };
        } catch {
            return {
                marketId: '',
                tokenId,
                bid: 0,
                ask: 0,
                midpoint: 0,
                spread: 0,
                volume: 0,
            };
        }
    }

    async canTrade(): Promise<{ allowed: boolean; reason?: string }> {
        // Check credentials
        const credentials = await prisma.credentials.findUnique({
            where: { userId: this.userId },
        });

        if (!credentials?.isConnected) {
            return { allowed: false, reason: 'Polymarket not connected' };
        }

        // Check kill switch
        const riskConfig = await prisma.riskConfig.findUnique({
            where: { userId: this.userId },
        });

        if (riskConfig?.killSwitchActive) {
            return { allowed: false, reason: `Kill switch active: ${riskConfig.killSwitchReason || 'No reason given'}` };
        }

        // Check daily loss limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = await prisma.order.findMany({
            where: {
                userId: this.userId,
                mode: 'LIVE',
                status: 'FILLED',
                filledAt: { gte: today },
            },
        });

        const todayPnl = todayOrders.reduce((sum, o) => {
            if (o.side === 'SELL') {
                return sum + (o.filledSize * (o.filledPrice || 0)) - o.fees;
            }
            return sum - (o.filledSize * (o.filledPrice || 0)) - o.fees;
        }, 0);

        if (riskConfig && todayPnl < -riskConfig.maxDailyLoss) {
            // Auto-activate kill switch
            await prisma.riskConfig.update({
                where: { userId: this.userId },
                data: {
                    killSwitchActive: true,
                    killSwitchReason: `Daily loss limit exceeded: $${Math.abs(todayPnl).toFixed(2)}`,
                    killSwitchActivatedAt: new Date(),
                },
            });

            return { allowed: false, reason: 'Daily loss limit exceeded - kill switch activated' };
        }

        return { allowed: true };
    }
}
