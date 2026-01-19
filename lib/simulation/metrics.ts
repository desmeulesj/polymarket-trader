import prisma from '@/lib/db';
import { TradingMode } from '@/lib/types';

export interface PerformanceMetrics {
    totalPnl: number;
    realizedPnl: number;
    unrealizedPnl: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio?: number;
    exposureTime: number; // Percentage of time with positions
    totalFees: number;
    netPnl: number;
}

export interface DailyMetrics {
    date: string;
    pnl: number;
    trades: number;
    volume: number;
    fees: number;
    positions: number;
}

/**
 * Calculate comprehensive performance metrics for a user
 */
export async function calculateMetrics(
    userId: string,
    mode: TradingMode,
    options: {
        startDate?: Date;
        endDate?: Date;
    } = {}
): Promise<PerformanceMetrics> {
    const { startDate, endDate } = options;

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Get all orders
    const orders = await prisma.order.findMany({
        where: {
            userId,
            mode,
            status: 'FILLED',
            ...(Object.keys(dateFilter).length > 0 ? { filledAt: dateFilter } : {}),
        },
        orderBy: { filledAt: 'asc' },
    });

    // Get all positions
    const positions = await prisma.position.findMany({
        where: { userId, mode },
    });

    // Calculate basic metrics
    const totalFees = orders.reduce((sum, o) => sum + o.fees, 0);
    const realizedPnl = positions.reduce((sum, p) => sum + p.realizedPnl, 0);
    const unrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalPnl = realizedPnl + unrealizedPnl;
    const netPnl = totalPnl - totalFees;

    // Calculate trade statistics
    const closedTrades = await getClosedTrades(userId, mode, dateFilter);
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => t.pnl > 0);
    const losingTrades = closedTrades.filter(t => t.pnl <= 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Calculate drawdown
    const { maxDrawdown, maxDrawdownPercent } = calculateDrawdown(orders);

    // Calculate exposure time
    const exposureTime = await calculateExposureTime(userId, mode, startDate, endDate);

    return {
        totalPnl,
        realizedPnl,
        unrealizedPnl,
        winRate,
        totalTrades,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        avgWin,
        avgLoss,
        profitFactor,
        maxDrawdown,
        maxDrawdownPercent,
        exposureTime,
        totalFees,
        netPnl,
    };
}

interface ClosedTrade {
    marketId: string;
    entryPrice: number;
    exitPrice: number;
    size: number;
    pnl: number;
    entryTime: Date;
    exitTime: Date;
}

async function getClosedTrades(
    userId: string,
    mode: TradingMode,
    dateFilter: { gte?: Date; lte?: Date }
): Promise<ClosedTrade[]> {
    // Get closed positions
    const closedPositions = await prisma.position.findMany({
        where: {
            userId,
            mode,
            closedAt: { not: null },
            ...(Object.keys(dateFilter).length > 0 ? { closedAt: dateFilter } : {}),
        },
    });

    return closedPositions.map(p => ({
        marketId: p.marketId,
        entryPrice: p.avgEntryPrice,
        exitPrice: p.currentPrice || p.avgEntryPrice,
        size: p.size,
        pnl: p.realizedPnl,
        entryTime: p.openedAt,
        exitTime: p.closedAt!,
    }));
}

function calculateDrawdown(orders: { filledAt: Date | null; filledSize: number; filledPrice: number | null; side: string; fees: number }[]): {
    maxDrawdown: number;
    maxDrawdownPercent: number;
} {
    if (orders.length === 0) {
        return { maxDrawdown: 0, maxDrawdownPercent: 0 };
    }

    const INITIAL_BALANCE = 10000;
    let balance = INITIAL_BALANCE;
    let peak = INITIAL_BALANCE;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    for (const order of orders) {
        const value = order.filledSize * (order.filledPrice || 0);
        if (order.side === 'BUY') {
            balance -= value + order.fees;
        } else {
            balance += value - order.fees;
        }

        if (balance > peak) {
            peak = balance;
        }

        const drawdown = peak - balance;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
            maxDrawdownPercent = drawdownPercent;
        }
    }

    return { maxDrawdown, maxDrawdownPercent };
}

async function calculateExposureTime(
    userId: string,
    mode: TradingMode,
    startDate?: Date,
    endDate?: Date
): Promise<number> {
    // Get all position changes
    const positions = await prisma.position.findMany({
        where: {
            userId,
            mode,
            ...(startDate ? { openedAt: { gte: startDate } } : {}),
        },
    });

    if (positions.length === 0) {
        return 0;
    }

    const start = startDate || positions[0].openedAt;
    const end = endDate || new Date();
    const totalTime = end.getTime() - start.getTime();

    // Calculate time with positions open
    let timeWithPositions = 0;
    for (const position of positions) {
        const positionEnd = position.closedAt || end;
        const positionStart = position.openedAt < start ? start : position.openedAt;
        timeWithPositions += Math.max(0, positionEnd.getTime() - positionStart.getTime());
    }

    return totalTime > 0 ? (timeWithPositions / totalTime) * 100 : 0;
}

/**
 * Get daily performance breakdown
 */
export async function getDailyMetrics(
    userId: string,
    mode: TradingMode,
    days: number = 30
): Promise<DailyMetrics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
        where: {
            userId,
            mode,
            status: 'FILLED',
            filledAt: { gte: startDate },
        },
        orderBy: { filledAt: 'asc' },
    });

    // Group by date
    const dailyMap = new Map<string, {
        pnl: number;
        trades: number;
        volume: number;
        fees: number;
    }>();

    for (const order of orders) {
        if (!order.filledAt) continue;

        const dateKey = order.filledAt.toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || { pnl: 0, trades: 0, volume: 0, fees: 0 };

        const value = order.filledSize * (order.filledPrice || 0);
        const pnlDelta = order.side === 'SELL' ? value - order.fees : -(value + order.fees);

        existing.pnl += pnlDelta;
        existing.trades += 1;
        existing.volume += value;
        existing.fees += order.fees;

        dailyMap.set(dateKey, existing);
    }

    // Get position counts per day
    const result: DailyMetrics[] = [];
    for (const [date, data] of dailyMap.entries()) {
        result.push({
            date,
            pnl: data.pnl,
            trades: data.trades,
            volume: data.volume,
            fees: data.fees,
            positions: 0, // Would need more complex calculation
        });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate Sharpe ratio (optional, requires risk-free rate)
 */
export function calculateSharpeRatio(
    returns: number[],
    riskFreeRate: number = 0.05 // 5% annual
): number | undefined {
    if (returns.length < 2) return undefined;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return undefined;

    // Annualize assuming daily returns
    const annualizedReturn = avgReturn * 252;
    const annualizedStdDev = stdDev * Math.sqrt(252);

    return (annualizedReturn - riskFreeRate) / annualizedStdDev;
}
