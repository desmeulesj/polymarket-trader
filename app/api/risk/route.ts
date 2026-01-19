import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { riskConfigSchema } from '@/lib/validation/schemas';
import { logAudit, logKillSwitch, AuditActions } from '@/lib/audit/logger';

// GET - Get risk configuration
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let riskConfig = await prisma.riskConfig.findUnique({
            where: { userId: session.user.id },
        });

        // Create default if doesn't exist
        if (!riskConfig) {
            riskConfig = await prisma.riskConfig.create({
                data: {
                    userId: session.user.id,
                    maxOrdersPerMinute: 10,
                    maxDailyLoss: 1000,
                    maxPositionSize: 500,
                    maxTotalExposure: 5000,
                    killSwitchActive: false,
                },
            });
        }

        return NextResponse.json({ riskConfig });
    } catch (error) {
        console.error('Risk config fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch risk configuration' },
            { status: 500 }
        );
    }
}

// PUT - Update risk configuration
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const result = riskConfigSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const existing = await prisma.riskConfig.findUnique({
            where: { userId: session.user.id },
        });

        const riskConfig = await prisma.riskConfig.upsert({
            where: { userId: session.user.id },
            update: result.data,
            create: {
                userId: session.user.id,
                ...result.data,
            },
        });

        // Audit log
        await logAudit({
            userId: session.user.id,
            action: AuditActions.RISK_CONFIG_UPDATED,
            category: 'RISK',
            details: {
                previous: existing,
                updated: result.data,
            },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json({ riskConfig });
    } catch (error) {
        console.error('Risk config update error:', error);
        return NextResponse.json(
            { error: 'Failed to update risk configuration' },
            { status: 500 }
        );
    }
}

// POST - Kill switch actions
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, reason } = await request.json();

        if (action === 'activate') {
            // Activate kill switch
            await prisma.riskConfig.update({
                where: { userId: session.user.id },
                data: {
                    killSwitchActive: true,
                    killSwitchReason: reason || 'Manual activation',
                    killSwitchActivatedAt: new Date(),
                },
            });

            // Cancel all live orders
            const cancelledOrders = await prisma.order.updateMany({
                where: {
                    userId: session.user.id,
                    mode: 'LIVE',
                    status: { in: ['OPEN', 'PENDING'] },
                },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                },
            });

            // Log kill switch activation
            await logKillSwitch(
                session.user.id,
                true,
                reason,
                request.headers.get('x-forwarded-for') || undefined
            );

            return NextResponse.json({
                message: 'Kill switch activated',
                ordersCancelled: cancelledOrders.count,
            });
        } else if (action === 'deactivate') {
            // Deactivate kill switch
            await prisma.riskConfig.update({
                where: { userId: session.user.id },
                data: {
                    killSwitchActive: false,
                    killSwitchReason: null,
                    killSwitchActivatedAt: null,
                },
            });

            // Log kill switch deactivation
            await logKillSwitch(
                session.user.id,
                false,
                reason,
                request.headers.get('x-forwarded-for') || undefined
            );

            return NextResponse.json({ message: 'Kill switch deactivated' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Kill switch error:', error);
        return NextResponse.json(
            { error: 'Failed to update kill switch' },
            { status: 500 }
        );
    }
}
