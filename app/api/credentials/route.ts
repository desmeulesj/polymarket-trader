import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { encrypt } from '@/lib/crypto/encryption';
import { apiCredentialsSchema } from '@/lib/validation/schemas';
import { logAudit, AuditActions } from '@/lib/audit/logger';

// GET - Get credentials status (not the actual credentials)
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const credentials = await prisma.credentials.findUnique({
            where: { userId: session.user.id },
            select: {
                isConnected: true,
                walletAddress: true,
                lastVerified: true,
            },
        });

        return NextResponse.json({
            hasCredentials: !!credentials,
            isConnected: credentials?.isConnected || false,
            walletAddress: credentials?.walletAddress || null,
            lastVerified: credentials?.lastVerified || null,
        });
    } catch (error) {
        console.error('Credentials fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch credentials' },
            { status: 500 }
        );
    }
}

// POST - Save credentials
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const result = apiCredentialsSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { apiKey, apiSecret, passphrase } = result.data;
        const walletAddress = body.walletAddress || null;

        // Encrypt credentials before storing
        const encryptedApiKey = encrypt(apiKey);
        const encryptedApiSecret = encrypt(apiSecret);
        const encryptedPassphrase = encrypt(passphrase);

        // Upsert credentials
        await prisma.credentials.upsert({
            where: { userId: session.user.id },
            create: {
                userId: session.user.id,
                walletAddress,
                encryptedApiKey,
                encryptedApiSecret,
                encryptedPassphrase,
                isConnected: false,
            },
            update: {
                walletAddress,
                encryptedApiKey,
                encryptedApiSecret,
                encryptedPassphrase,
                updatedAt: new Date(),
            },
        });

        // Audit log
        await logAudit({
            userId: session.user.id,
            action: AuditActions.CREDENTIALS_UPDATED,
            category: 'SETTINGS',
            details: { walletAddress },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json({ success: true, message: 'Credentials saved successfully' });
    } catch (error) {
        console.error('Credentials save error:', error);
        return NextResponse.json(
            { error: 'Failed to save credentials' },
            { status: 500 }
        );
    }
}

// DELETE - Remove credentials
export async function DELETE() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.credentials.delete({
            where: { userId: session.user.id },
        });

        return NextResponse.json({ success: true, message: 'Credentials deleted' });
    } catch (error) {
        console.error('Credentials delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete credentials' },
            { status: 500 }
        );
    }
}
