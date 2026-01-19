import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { strategyUpdateSchema } from '@/lib/validation/schemas';
import { logAudit, AuditActions } from '@/lib/audit/logger';

// GET - Get single strategy
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const strategy = await prisma.strategy.findFirst({
            where: { id, userId: session.user.id },
            include: {
                versions: {
                    orderBy: { version: 'desc' },
                    take: 10,
                },
                runs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!strategy) {
            return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
        }

        return NextResponse.json({ strategy });
    } catch (error) {
        console.error('Strategy fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch strategy' },
            { status: 500 }
        );
    }
}

// PUT - Update strategy
export async function PUT(
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

        const result = strategyUpdateSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.flatten() },
                { status: 400 }
            );
        }

        // Check ownership
        const existing = await prisma.strategy.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
        }

        const { code, ...updateData } = result.data;
        let newVersion = existing.version;

        // If code changed, increment version
        if (code && code !== existing.code) {
            newVersion = existing.version + 1;

            // Create new version
            await prisma.strategyVersion.create({
                data: {
                    strategyId: id,
                    version: newVersion,
                    code,
                    parameters: updateData.parameters || existing.parameters,
                    changelog: body.changelog || `Version ${newVersion}`,
                },
            });
        }

        // Update strategy
        const strategy = await prisma.strategy.update({
            where: { id },
            data: {
                ...updateData,
                ...(code ? { code, version: newVersion } : {}),
            },
        });

        // Audit log
        await logAudit({
            userId: session.user.id,
            action: AuditActions.STRATEGY_UPDATED,
            category: 'STRATEGY',
            details: {
                strategyId: id,
                version: newVersion,
                changes: Object.keys(updateData),
            },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json({ strategy });
    } catch (error) {
        console.error('Strategy update error:', error);
        return NextResponse.json(
            { error: 'Failed to update strategy' },
            { status: 500 }
        );
    }
}

// DELETE - Delete strategy
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check ownership
        const existing = await prisma.strategy.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
        }

        // Delete (cascade will handle versions and runs)
        await prisma.strategy.delete({
            where: { id },
        });

        // Audit log
        await logAudit({
            userId: session.user.id,
            action: AuditActions.STRATEGY_DELETED,
            category: 'STRATEGY',
            details: { strategyId: id, name: existing.name },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json({ message: 'Strategy deleted' });
    } catch (error) {
        console.error('Strategy delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete strategy' },
            { status: 500 }
        );
    }
}
