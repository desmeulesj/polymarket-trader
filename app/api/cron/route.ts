import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { TradingMode } from '@/lib/types';
import { createBroker } from '@/lib/trading';
import { logAudit, AuditActions } from '@/lib/audit/logger';

// Cron endpoint for scheduled strategy execution
// Protected by CRON_SECRET
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('CRON_SECRET not configured');
            return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find all active strategies that should run
        const activeStrategies = await prisma.strategy.findMany({
            where: {
                isActive: true,
                schedule: { not: null },
            },
            include: {
                user: {
                    include: {
                        riskConfig: true,
                    },
                },
            },
        });

        const results = [];

        for (const strategy of activeStrategies) {
            // Skip if kill switch is active
            if (strategy.user.riskConfig?.killSwitchActive) {
                results.push({
                    strategyId: strategy.id,
                    status: 'skipped',
                    reason: 'Kill switch active',
                });
                continue;
            }

            try {
                // Create run record
                const run = await prisma.strategyRun.create({
                    data: {
                        strategyId: strategy.id,
                        mode: 'PAPER', // Cron runs default to PAPER
                        status: 'RUNNING',
                        trigger: 'CRON',
                        startedAt: new Date(),
                    },
                });

                // Execute strategy
                const broker = createBroker('PAPER' as TradingMode, strategy.userId);
                const executionResult = await executeStrategy(strategy, broker);

                // Update run
                await prisma.strategyRun.update({
                    where: { id: run.id },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                        duration: Date.now() - run.startedAt!.getTime(),
                        metrics: executionResult.metrics,
                        logs: executionResult.logs,
                    },
                });

                results.push({
                    strategyId: strategy.id,
                    runId: run.id,
                    status: 'completed',
                    metrics: executionResult.metrics,
                });
            } catch (error) {
                results.push({
                    strategyId: strategy.id,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Log cron execution
        await logAudit({
            userId: 'system',
            action: AuditActions.CRON_EXECUTED,
            category: 'SYSTEM',
            details: {
                strategiesProcessed: activeStrategies.length,
                results,
            },
        });

        return NextResponse.json({
            processed: activeStrategies.length,
            results,
        });
    } catch (error) {
        console.error('Cron execution error:', error);
        return NextResponse.json(
            { error: 'Cron execution failed' },
            { status: 500 }
        );
    }
}

// Simplified strategy execution
async function executeStrategy(
    strategy: { code: string; parameters: any; marketIds: string[] },
    broker: ReturnType<typeof createBroker>
): Promise<{ metrics: Record<string, number>; logs: string }> {
    const logs: string[] = [];
    logs.push(`[${new Date().toISOString()}] Cron: Strategy execution started`);

    const canTrade = await broker.canTrade();
    if (!canTrade.allowed) {
        logs.push(`[${new Date().toISOString()}] Trading not allowed: ${canTrade.reason}`);
        return { metrics: { ordersPlaced: 0 }, logs: logs.join('\n') };
    }

    const positions = await broker.getPositions();
    const balance = await broker.getBalance();

    logs.push(`[${new Date().toISOString()}] Positions: ${positions.length}`);
    logs.push(`[${new Date().toISOString()}] Balance: $${balance.available.toFixed(2)}`);
    logs.push(`[${new Date().toISOString()}] Cron: Strategy execution completed`);

    return {
        metrics: {
            ordersPlaced: 0,
            positionsOpen: positions.length,
            balanceAvailable: balance.available,
        },
        logs: logs.join('\n'),
    };
}
