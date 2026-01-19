import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { createClient } from '@/lib/polymarket/client';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = createClient();
        const markets = await client.getMarkets({ active: true, limit: 50 });

        return NextResponse.json({ markets });
    } catch (error) {
        console.error('Markets fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch markets' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { search, category, limit = 20 } = await request.json();

        const client = createClient();

        let markets;
        if (search) {
            markets = await client.searchMarkets(search, limit);
        } else {
            markets = await client.getMarkets({
                active: true,
                limit,
                category,
            });
        }

        // Cache markets in database for faster future access
        for (const market of markets.slice(0, 10)) {
            await prisma.marketCache.upsert({
                where: { id: market.id },
                update: {
                    title: market.question,
                    description: market.description,
                    outcomes: market.outcomes,
                    outcomePrices: market.outcome_prices ? JSON.parse(market.outcome_prices) : null,
                    volume: market.volume_num,
                    liquidity: market.liquidity_num,
                    closed: market.closed,
                    updatedAt: new Date(),
                },
                create: {
                    id: market.id,
                    conditionId: market.condition_id,
                    slug: market.slug,
                    title: market.question,
                    description: market.description,
                    outcomes: market.outcomes,
                    outcomePrices: market.outcome_prices ? JSON.parse(market.outcome_prices) : null,
                    volume: market.volume_num,
                    liquidity: market.liquidity_num,
                    closed: market.closed,
                },
            });
        }

        return NextResponse.json({ markets });
    } catch (error) {
        console.error('Markets search error:', error);
        return NextResponse.json(
            { error: 'Failed to search markets' },
            { status: 500 }
        );
    }
}
