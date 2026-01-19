import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { TradingMode } from '@/lib/types';
import { createBroker } from '@/lib/trading';
import { logStrategyRun } from '@/lib/audit/logger';

// POST - Run strategy
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const mode: TradingMode = body.mode || 'PAPER';
        const runParameters = body.parameters || {};

        // Get strategy
        const strategy = await prisma.strategy.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!strategy) {
            return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
        }

        // Check risk config for kill switch
        const riskConfig = await prisma.riskConfig.findUnique({
            where: { userId: session.user.id },
        });

        if (riskConfig?.killSwitchActive && mode === 'LIVE') {
            return NextResponse.json(
                { error: 'Kill switch is active. Disable it to run live strategies.' },
                { status: 403 }
            );
        }

        // Create run record
        const run = await prisma.strategyRun.create({
            data: {
                strategyId: id,
                mode,
                status: 'RUNNING',
                trigger: 'MANUAL',
                startedAt: new Date(),
            },
        });

        // Log run started
        await logStrategyRun(
            session.user.id,
            id,
            run.id,
            'started',
            { mode, parameters: runParameters }
        );

        try {
            // Execute strategy (simplified - in production would call Python runtime)
            const broker = createBroker(mode, session.user.id);

            // Parse and execute strategy code
            // This is a simplified version - actual implementation would use Python
            const result = await executeStrategy(strategy.code, broker, {
                ...strategy.parameters,
                ...runParameters,
                marketIds: strategy.marketIds,
            });

            // Update run record
            await prisma.strategyRun.update({
                where: { id: run.id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    duration: Date.now() - run.startedAt!.getTime(),
                    metrics: result.metrics,
                    logs: result.logs,
                },
            });

            // Log run completed
            await logStrategyRun(
                session.user.id,
                id,
                run.id,
                'completed',
                { metrics: result.metrics }
            );

            return NextResponse.json({
                runId: run.id,
                status: 'COMPLETED',
                metrics: result.metrics,
                ordersPlaced: result.ordersPlaced,
            });
        } catch (executionError) {
            // Update run as failed
            await prisma.strategyRun.update({
                where: { id: run.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    error: executionError instanceof Error ? executionError.message : 'Execution failed',
                },
            });

            // Log run failed
            await logStrategyRun(
                session.user.id,
                id,
                run.id,
                'failed',
                { error: executionError instanceof Error ? executionError.message : 'Unknown error' }
            );

            throw executionError;
        }
    } catch (error) {
        console.error('Strategy run error:', error);
        return NextResponse.json(
            { error: 'Failed to run strategy', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Simplified strategy execution (placeholder for Python runtime)
async function executeStrategy(
    code: string,
    broker: ReturnType<typeof createBroker>,
    parameters: Record<string, unknown>
): Promise<{
    metrics: Record<string, number>;
    logs: string;
    ordersPlaced: number;
}> {
    // This is a placeholder - actual implementation would:
    // 1. Call Python serverless function with the strategy code
    // 2. Pass market data and broker interface
    // 3. Execute strategy and collect results

    const logs: string[] = [];
    logs.push(`[${new Date().toISOString()}] Strategy execution started`);
    logs.push(`[${new Date().toISOString()}] Parameters: ${JSON.stringify(parameters)}`);
    logs.push(`[${new Date().toISOString()}] Mode: ${broker.mode}`);

    // Simulate strategy execution
    const canTrade = await broker.canTrade();
    if (!canTrade.allowed) {
        logs.push(`[${new Date().toISOString()}] Trading not allowed: ${canTrade.reason}`);
        return {
            metrics: { ordersPlaced: 0, pnl: 0 },
            logs: logs.join('\n'),
            ordersPlaced: 0,
        };
    }

    // Get positions
    const positions = await broker.getPositions();
    logs.push(`[${new Date().toISOString()}] Current positions: ${positions.length}`);

    // Get balance
    const balance = await broker.getBalance();
    logs.push(`[${new Date().toISOString()}] Available balance: $${balance.available.toFixed(2)}`);

    logs.push(`[${new Date().toISOString()}] Strategy execution completed`);

    return {
        metrics: {
            ordersPlaced: 0,
            positionsOpen: positions.length,
            balanceAvailable: balance.available,
            balanceTotal: balance.total,
        },
        logs: logs.join('\n'),
        ordersPlaced: 0,
    };
}
