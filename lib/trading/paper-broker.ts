import { OrderStatus, TradingMode, OrderSide, OrderType } from '@/lib/types';
import prisma from '@/lib/db';
import { PolymarketClient, createClient } from '@/lib/polymarket/client';
import { logOrderPlaced } from '@/lib/audit/logger';
import {
    Broker,
    BrokerConfig,
    OrderRequest,
    OrderResult,
    PositionInfo,
    BrokerBalance,
    MarketState,
    calculateSlippage,
    calculateFees,
    SlippageConfig,
} from './types';

const DEFAULT_INITIAL_BALANCE = 10000; // $10,000 paper trading balance

/**
 * Paper Trading Broker
 * Simulates order execution against real market data without actual trades
 */
export class PaperBroker implements Broker {
    readonly mode: TradingMode = 'PAPER';
    readonly userId: string;

    private polymarket: PolymarketClient;
    private slippageConfig: SlippageConfig;
    private initialBalance: number;

    constructor(config: BrokerConfig) {
        this.userId = config.userId;
        this.polymarket = createClient();
        this.slippageConfig = {
            model: config.slippageModel || 'realistic',
            realisticParams: { impactFactor: 0.05, spreadMultiplier: 1.2 },
        };
        this.initialBalance = DEFAULT_INITIAL_BALANCE;
    }

    async placeOrder(order: OrderRequest): Promise<OrderResult> {
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

        try {
            // Get current market state
            const marketState = await this.getMarketState(order.tokenId);

            // Calculate execution price based on order type
            let executionPrice: number;
            let slippage = 0;

            if (order.type === 'MARKET' || order.type === 'FAK' || order.type === 'FOK') {
                // Market order - execute at market price with slippage
                const basePrice = order.side === 'BUY' ? marketState.ask : marketState.bid;
                slippage = calculateSlippage(
                    order.size,
                    basePrice,
                    marketState.volume * 100, // Estimate liquidity from volume
                    this.slippageConfig
                );
                executionPrice = order.side === 'BUY' ? basePrice + slippage : basePrice - slippage;
            } else {
                // Limit order - check if can fill
                const limitPrice = order.price || 0;
                const canFill = order.side === 'BUY'
                    ? limitPrice >= marketState.ask
                    : limitPrice <= marketState.bid;

                if (!canFill) {
                    // Create pending order
                    const pendingOrder = await prisma.order.create({
                        data: {
                            userId: this.userId,
                            marketId: order.marketId,
                            tokenId: order.tokenId,
                            marketTitle: order.marketTitle,
                            outcome: order.outcome,
                            side: order.side,
                            type: order.type,
                            size: order.size,
                            price: limitPrice,
                            status: 'OPEN',
                            mode: 'PAPER',
                        },
                    });

                    return {
                        id: pendingOrder.id,
                        success: true,
                        status: 'OPEN',
                        filledSize: 0,
                        fees: 0,
                    };
                }

                executionPrice = limitPrice;
            }

            // Calculate fees
            const isMaker = order.type === 'LIMIT' || order.type === 'GTC' || order.type === 'GTD';
            const fees = calculateFees(order.size, executionPrice, isMaker);

            // Create filled order
            const filledOrder = await prisma.order.create({
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
                    status: 'FILLED',
                    mode: 'PAPER',
                    filledSize: order.size,
                    filledPrice: executionPrice,
                    fees,
                    slippage,
                    filledAt: new Date(),
                },
            });

            // Update position
            await this.updatePosition(order, executionPrice);

            // Audit log
            await logOrderPlaced(this.userId, filledOrder.id, {
                mode: 'PAPER',
                side: order.side,
                type: order.type,
                size: order.size,
                price: executionPrice,
                fees,
                slippage,
                marketId: order.marketId,
            });

            return {
                id: filledOrder.id,
                success: true,
                status: 'FILLED',
                filledSize: order.size,
                filledPrice: executionPrice,
                fees,
                slippage,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

    private async updatePosition(order: OrderRequest, executionPrice: number): Promise<void> {
        const existingPosition = await prisma.position.findUnique({
            where: {
                userId_marketId_tokenId_mode: {
                    userId: this.userId,
                    marketId: order.marketId,
                    tokenId: order.tokenId,
                    mode: 'PAPER',
                },
            },
        });

        if (order.side === 'BUY') {
            if (existingPosition) {
                // Add to position
                const newSize = existingPosition.size + order.size;
                const newAvgPrice =
                    (existingPosition.size * existingPosition.avgEntryPrice + order.size * executionPrice) / newSize;

                await prisma.position.update({
                    where: { id: existingPosition.id },
                    data: {
                        size: newSize,
                        avgEntryPrice: newAvgPrice,
                        currentPrice: executionPrice,
                    },
                });
            } else {
                // Create new position
                await prisma.position.create({
                    data: {
                        userId: this.userId,
                        marketId: order.marketId,
                        tokenId: order.tokenId,
                        marketTitle: order.marketTitle,
                        outcome: order.outcome,
                        mode: 'PAPER',
                        size: order.size,
                        avgEntryPrice: executionPrice,
                        currentPrice: executionPrice,
                    },
                });
            }
        } else {
            // SELL - reduce position
            if (existingPosition) {
                const newSize = existingPosition.size - order.size;
                const realizedPnl = (executionPrice - existingPosition.avgEntryPrice) * order.size;

                if (newSize <= 0) {
                    // Close position
                    await prisma.position.update({
                        where: { id: existingPosition.id },
                        data: {
                            size: 0,
                            realizedPnl: existingPosition.realizedPnl + realizedPnl,
                            closedAt: new Date(),
                        },
                    });
                } else {
                    // Reduce position
                    await prisma.position.update({
                        where: { id: existingPosition.id },
                        data: {
                            size: newSize,
                            realizedPnl: existingPosition.realizedPnl + realizedPnl,
                            currentPrice: executionPrice,
                        },
                    });
                }
            }
        }
    }

    async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const order = await prisma.order.findFirst({
                where: { id: orderId, userId: this.userId, mode: 'PAPER' },
            });

            if (!order) {
                return { success: false, error: 'Order not found' };
            }

            if (order.status !== 'OPEN' && order.status !== 'PENDING') {
                return { success: false, error: 'Order cannot be cancelled' };
            }

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
        const result = await prisma.order.updateMany({
            where: {
                userId: this.userId,
                mode: 'PAPER',
                status: { in: ['OPEN', 'PENDING'] },
            },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
        });

        return { cancelled: result.count, failed: 0 };
    }

    async getOpenOrders(): Promise<OrderResult[]> {
        const orders = await prisma.order.findMany({
            where: {
                userId: this.userId,
                mode: 'PAPER',
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
            slippage: o.slippage || undefined,
        }));
    }

    async getPositions(): Promise<PositionInfo[]> {
        const positions = await prisma.position.findMany({
            where: {
                userId: this.userId,
                mode: 'PAPER',
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

    async getBalance(): Promise<BrokerBalance> {
        // Calculate balance from orders and positions
        const [orders, positions] = await Promise.all([
            prisma.order.findMany({
                where: { userId: this.userId, mode: 'PAPER' },
            }),
            prisma.position.findMany({
                where: { userId: this.userId, mode: 'PAPER' },
            }),
        ]);

        // Total spent on buys minus received from sells
        const spent = orders
            .filter(o => o.status === 'FILLED' && o.side === 'BUY')
            .reduce((sum, o) => sum + (o.filledSize * (o.filledPrice || 0)) + o.fees, 0);

        const received = orders
            .filter(o => o.status === 'FILLED' && o.side === 'SELL')
            .reduce((sum, o) => sum + (o.filledSize * (o.filledPrice || 0)) - o.fees, 0);

        // Value in open orders
        const inOrders = orders
            .filter(o => o.status === 'OPEN' && o.side === 'BUY')
            .reduce((sum, o) => sum + (o.size * (o.price || 0)), 0);

        // Value in positions
        const inPositions = positions
            .reduce((sum, p) => sum + (p.size * (p.currentPrice || p.avgEntryPrice)), 0);

        const available = this.initialBalance - spent + received - inOrders;

        return {
            available,
            inOrders,
            inPositions,
            total: available + inOrders + inPositions,
            currency: 'USDC',
        };
    }

    async getMarketState(tokenId: string): Promise<MarketState> {
        try {
            const [spread, midpoint] = await Promise.all([
                this.polymarket.getSpread(tokenId),
                this.polymarket.getPrice(tokenId),
            ]);

            return {
                marketId: '', // Would need to look up from token
                tokenId,
                bid: spread.bid,
                ask: spread.ask,
                midpoint,
                spread: spread.spread,
                volume: 0, // Would need additional API call
            };
        } catch {
            // Return default state if API fails
            return {
                marketId: '',
                tokenId,
                bid: 0.45,
                ask: 0.55,
                midpoint: 0.5,
                spread: 0.1,
                volume: 0,
            };
        }
    }

    async canTrade(): Promise<{ allowed: boolean; reason?: string }> {
        // Check risk limits
        const riskConfig = await prisma.riskConfig.findUnique({
            where: { userId: this.userId },
        });

        if (riskConfig?.killSwitchActive) {
            return { allowed: false, reason: 'Kill switch is active' };
        }

        // Check daily loss limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = await prisma.order.findMany({
            where: {
                userId: this.userId,
                mode: 'PAPER',
                status: 'FILLED',
                filledAt: { gte: today },
            },
        });

        // Calculate today's PnL (simplified)
        const todayPnl = todayOrders.reduce((sum, o) => {
            if (o.side === 'SELL') {
                return sum + (o.filledSize * (o.filledPrice || 0)) - o.fees;
            }
            return sum - (o.filledSize * (o.filledPrice || 0)) - o.fees;
        }, 0);

        if (riskConfig && todayPnl < -riskConfig.maxDailyLoss) {
            return { allowed: false, reason: 'Daily loss limit exceeded' };
        }

        return { allowed: true };
    }
}
