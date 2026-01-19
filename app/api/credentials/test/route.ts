import { NextResponse } from 'next/server';
import { createClient } from '@/lib/polymarket/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { logAudit, AuditActions } from '@/lib/audit/logger';

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

        try {
            // We use getOpenOrders as a smoke test
            // If credentials are bad, this should throw or return error from CLOB
            await client.getOpenOrders();

            // Log success
            await logAudit({
                userId: session.user.id,
                action: AuditActions.CREDENTIALS_VERIFIED,
                category: 'SETTINGS',
                details: { success: true },
            });

        } catch (apiError: any) {
            console.error('Polymarket API Error during test:', apiError);

            const errorDetails = apiError?.details || { message: apiError?.message };

            // Log failure to database so we can see it in Logs page
            // Using SYSTEM category to ensure it works even if SETTINGS is missing in DB enum
            await logAudit({
                userId: session.user.id,
                action: 'credentials.verification_failed',
                category: 'SYSTEM',
                details: {
                    error: errorDetails,
                    apiKeyPrefix: apiKey.substring(0, 4) + '...',
                    hasSecret: !!apiSecret,
                    hasPassphrase: !!passphrase
                },
            });

            return NextResponse.json(
                {
                    error: 'Connection failed',
                    details: apiError?.message || 'Invalid API Credentials',
                    debug: errorDetails // Send detailed error to client for debugging
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
