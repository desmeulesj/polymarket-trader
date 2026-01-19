import { TradingMode } from '@prisma/client';
import prisma from '@/lib/db';
import { PolymarketClient, createClient } from '@/lib/polymarket/client';
import { logAudit, AuditActions } from '@/lib/audit/logger';
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

/**
 * Shadow Trading Broker
 * Executes strategy logic with live data but only records "would-have" orders
 * Useful for validating strategies without risk before going live
 */
export class ShadowBroker implements Broker {
    readonly mode: TradingMode = 'SHADOW';
    readonly userId: string;

    private polymarket: PolymarketClient;
    private slippageConfig: SlippageConfig;

    constructor(config: BrokerConfig) {
        this.userId = config.userId;
        this.polymarket = createClient();
        this.slippageConfig = {
            model: config.slippageModel || 'realistic',
            realisticParams: { impactFactor: 0.05, spreadMultiplier: 1.2 },
        };
    }

    async placeOrder(order: OrderRequest): Promise<OrderResult> {
        try {
            // Get LIVE market state (same as live broker would see)
            const marketState = await this.getMarketState(order.tokenId);

            // Calculate what execution would look like
            let simulatedPrice: number;
            let slippage = 0;

            if (order.type === 'MARKET' || order.type === 'FAK' || order.type === 'FOK') {
                const basePrice = order.side === 'BUY' ? marketState.ask : marketState.bid;
                slippage = calculateSlippage(
                    order.size,
                    basePrice,
                    marketState.volume * 100,
                    this.slippageConfig
                );
                simulatedPrice = order.side === 'BUY' ? basePrice + slippage : basePrice - slippage;
            } else {
                simulatedPrice = order.price || marketState.midpoint;
            }

            const fees = calculateFees(order.size, simulatedPrice, false);

            // Record shadow order - never actually executed
            const shadowOrder = await prisma.order.create({
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
                    status: 'FILLED', // Mark as "filled" for tracking
                    mode: 'SHADOW',
                    filledSize: order.size,
                    filledPrice: simulatedPrice,
                    fees,
                    slippage,
                    filledAt: new Date(),
                },
            });

            // Update shadow position
            await this.updateShadowPosition(order, simulatedPrice);

            // Log the shadow trade
            await logAudit({
                userId: this.userId,
                action: AuditActions.ORDER_PLACED,
                category: 'TRADING',
                details: {
                    mode: 'SHADOW',
                    orderId: shadowOrder.id,
                    side: order.side,
                    type: order.type,
                    size: order.size,
                    simulatedPrice,
                    fees,
                    slippage,
                    marketId: order.marketId,
                    note: 'Shadow order - not executed on exchange',
                },
            });

            return {
                id: shadowOrder.id,
                success: true,
                status: 'FILLED',
                filledSize: order.size,
                filledPrice: simulatedPrice,
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

    private async updateShadowPosition(order: OrderRequest, executionPrice: number): Promise<void> {
        const existingPosition = await prisma.position.findUnique({
            where: {
                userId_marketId_tokenId_mode: {
                    userId: this.userId,
                    marketId: order.marketId,
                    tokenId: order.tokenId,
                    mode: 'SHADOW',
                },
            },
        });

        if (order.side === 'BUY') {
            if (existingPosition) {
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
                await prisma.position.create({
                    data: {
                        userId: this.userId,
                        marketId: order.marketId,
                        tokenId: order.tokenId,
                        marketTitle: order.marketTitle,
                        outcome: order.outcome,
                        mode: 'SHADOW',
                        size: order.size,
                        avgEntryPrice: executionPrice,
                        currentPrice: executionPrice,
                    },
                });
            }
        } else {
            if (existingPosition) {
                const newSize = existingPosition.size - order.size;
                const realizedPnl = (executionPrice - existingPosition.avgEntryPrice) * order.size;

                if (newSize <= 0) {
                    await prisma.position.update({
                        where: { id: existingPosition.id },
                        data: {
                            size: 0,
                            realizedPnl: existingPosition.realizedPnl + realizedPnl,
                            closedAt: new Date(),
                        },
                    });
                } else {
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
        // Shadow orders are immediately "filled" so can't be cancelled
        // But we record the intent
        try {
            const order = await prisma.order.findFirst({
                where: { id: orderId, userId: this.userId, mode: 'SHADOW' },
            });

            if (!order) {
                return { success: false, error: 'Order not found' };
            }

            // Just log the cancellation attempt
            await logAudit({
                userId: this.userId,
                action: AuditActions.ORDER_CANCELLED,
                category: 'TRADING',
                details: {
                    mode: 'SHADOW',
                    orderId,
                    note: 'Shadow order cancellation recorded',
                },
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async cancelAllOrders(): Promise<{ cancelled: number; failed: number }> {
        // Shadow orders can't be cancelled (already "filled")
        return { cancelled: 0, failed: 0 };
    }

    async getOpenOrders(): Promise<OrderResult[]> {
        // Shadow orders are immediately filled, no open orders
        return [];
    }

    async getPositions(): Promise<PositionInfo[]> {
        const positions = await prisma.position.findMany({
            where: {
                userId: this.userId,
                mode: 'SHADOW',
                size: { gt: 0 },
            },
        });

        // Update current prices from live data
        const positionsWithPrices = await Promise.all(
            positions.map(async (p) => {
                let currentPrice = p.currentPrice;
                try {
                    currentPrice = await this.polymarket.getPrice(p.tokenId);
                } catch {
                    // Keep existing price
                }

                const unrealizedPnl = (currentPrice || p.avgEntryPrice) - p.avgEntryPrice * p.size;

                return {
                    marketId: p.marketId,
                    tokenId: p.tokenId,
                    marketTitle: p.marketTitle || undefined,
                    outcome: p.outcome || undefined,
                    size: p.size,
                    avgEntryPrice: p.avgEntryPrice,
                    currentPrice: currentPrice || undefined,
                    realizedPnl: p.realizedPnl,
                    unrealizedPnl,
                };
            })
        );

        return positionsWithPrices;
    }

    async getBalance(): Promise<BrokerBalance> {
        // Calculate from shadow orders
        const [orders, positions] = await Promise.all([
            prisma.order.findMany({
                where: { userId: this.userId, mode: 'SHADOW' },
            }),
            prisma.position.findMany({
                where: { userId: this.userId, mode: 'SHADOW' },
            }),
        ]);

        const INITIAL_BALANCE = 10000;

        const spent = orders
            .filter(o => o.status === 'FILLED' && o.side === 'BUY')
            .reduce((sum, o) => sum + (o.filledSize * (o.filledPrice || 0)) + o.fees, 0);

        const received = orders
            .filter(o => o.status === 'FILLED' && o.side === 'SELL')
            .reduce((sum, o) => sum + (o.filledSize * (o.filledPrice || 0)) - o.fees, 0);

        const inPositions = positions
            .reduce((sum, p) => sum + (p.size * (p.currentPrice || p.avgEntryPrice)), 0);

        const available = INITIAL_BALANCE - spent + received;

        return {
            available,
            inOrders: 0,
            inPositions,
            total: available + inPositions,
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
                bid: 0.45,
                ask: 0.55,
                midpoint: 0.5,
                spread: 0.1,
                volume: 0,
            };
        }
    }

    async canTrade(): Promise<{ allowed: boolean; reason?: string }> {
        // Shadow trading always allowed (no real money involved)
        return { allowed: true };
    }

    /**
     * Compare shadow performance against paper trading
     */
    async compareWithPaper(): Promise<{
        shadowPnl: number;
        paperPnl: number;
        difference: number;
        trades: number;
    }> {
        const [shadowPositions, paperPositions, shadowOrders, paperOrders] = await Promise.all([
            prisma.position.findMany({ where: { userId: this.userId, mode: 'SHADOW' } }),
            prisma.position.findMany({ where: { userId: this.userId, mode: 'PAPER' } }),
            prisma.order.findMany({ where: { userId: this.userId, mode: 'SHADOW', status: 'FILLED' } }),
            prisma.order.findMany({ where: { userId: this.userId, mode: 'PAPER', status: 'FILLED' } }),
        ]);

        const shadowPnl = shadowPositions.reduce((sum, p) => sum + p.realizedPnl + p.unrealizedPnl, 0);
        const paperPnl = paperPositions.reduce((sum, p) => sum + p.realizedPnl + p.unrealizedPnl, 0);

        return {
            shadowPnl,
            paperPnl,
            difference: shadowPnl - paperPnl,
            trades: shadowOrders.length,
        };
    }
}
