import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { TradingMode } from '@/lib/types';
import { createBroker } from '@/lib/trading';
import { orderRequestSchema } from '@/lib/validation/schemas';
import { checkEndpointRateLimit } from '@/lib/utils/rate-limiter';

// GET - Get orders for user
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const mode = (searchParams.get('mode') as TradingMode) || undefined;
        const status = searchParams.get('status') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');

        const orders = await prisma.order.findMany({
            where: {
                userId: session.user.id,
                ...(mode ? { mode } : {}),
                ...(status ? { status: status as any } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                strategy: {
                    select: { name: true },
                },
            },
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error('Orders fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}

// POST - Place an order
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limiting
        const rateLimit = checkEndpointRateLimit('orders', session.user.id);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
                { status: 429 }
            );
        }

        const body = await request.json();
        const result = orderRequestSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { marketId, tokenId, side, type, size, price, mode } = result.data;
        const tradingMode: TradingMode = mode || 'PAPER';

        // Create broker and place order
        const broker = createBroker(tradingMode, session.user.id);

        // Initialize if live broker
        if (tradingMode === 'LIVE' && 'initialize' in broker) {
            await (broker as any).initialize();
        }

        const orderResult = await broker.placeOrder({
            marketId,
            tokenId,
            side,
            type,
            size,
            price,
        });

        if (!orderResult.success) {
            return NextResponse.json(
                { error: orderResult.error || 'Order failed' },
                { status: 400 }
            );
        }

        return NextResponse.json({ order: orderResult }, { status: 201 });
    } catch (error) {
        console.error('Order placement error:', error);
        return NextResponse.json(
            { error: 'Failed to place order' },
            { status: 500 }
        );
    }
}

// DELETE - Cancel order
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId, mode } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        const tradingMode: TradingMode = mode || 'PAPER';
        const broker = createBroker(tradingMode, session.user.id);

        if (tradingMode === 'LIVE' && 'initialize' in broker) {
            await (broker as any).initialize();
        }

        const result = await broker.cancelOrder(orderId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Cancel failed' },
                { status: 400 }
            );
        }

        return NextResponse.json({ message: 'Order cancelled' });
    } catch (error) {
        console.error('Order cancel error:', error);
        return NextResponse.json(
            { error: 'Failed to cancel order' },
            { status: 500 }
        );
    }
}
