import { NextResponse } from 'next/server';
import { createClient } from '@/lib/polymarket/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const testCredentialsSchema = z.object({
    apiKey: z.string().min(1),
    apiSecret: z.string().min(1),
    passphrase: z.string().min(1),
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const validation = testCredentialsSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid credentials format' },
                { status: 400 }
            );
        }

        const { apiKey, apiSecret, passphrase } = validation.data;

        // Initialize client with provided credentials
        const client = createClient({
            apiKey,
            apiSecret,
            passphrase,
        });

        // Try to fetch open orders to verify credentials
        // This is a safe read-only operation that requires valid auth
        try {
            // We use getOpenOrders as a smoke test
            // If credentials are bad, this should throw or return error from CLOB
            await client.getOpenOrders();
        } catch (apiError: any) {
            console.error('Polymarket API Error during test:', apiError);
            return NextResponse.json(
                {
                    error: 'Connection failed',
                    details: apiError?.message || 'Invalid API Credentials'
                },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, message: 'Connection successful!' });

    } catch (error) {
        console.error('Test credentials error:', error);
        return NextResponse.json(
            { error: 'Internal server error during test' },
            { status: 500 }
        );
    }
}
