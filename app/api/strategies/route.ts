import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { strategySchema, strategyUpdateSchema } from '@/lib/validation/schemas';
import { logAudit, AuditActions } from '@/lib/audit/logger';

// GET - List all strategies for user
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const strategies = await prisma.strategy.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { runs: true },
                },
            },
        });

        return NextResponse.json({ strategies });
    } catch (error) {
        console.error('Strategies fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch strategies' },
            { status: 500 }
        );
    }
}

// POST - Create new strategy
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const result = strategySchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { name, description, code, parameters, marketIds, schedule, isActive } = result.data;

        // Create strategy
        const strategy = await prisma.strategy.create({
            data: {
                userId: session.user.id,
                name,
                description,
                code,
                version: 1,
                parameters: parameters || {},
                marketIds: marketIds || [],
                schedule,
                isActive: isActive ?? false,
            },
        });

        // Create first version
        await prisma.strategyVersion.create({
            data: {
                strategyId: strategy.id,
                version: 1,
                code,
                parameters: parameters || {},
                changelog: 'Initial version',
            },
        });

        // Audit log
        await logAudit({
            userId: session.user.id,
            action: AuditActions.STRATEGY_CREATED,
            category: 'STRATEGY',
            details: { strategyId: strategy.id, name },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json({ strategy }, { status: 201 });
    } catch (error) {
        console.error('Strategy creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create strategy' },
            { status: 500 }
        );
    }
}
