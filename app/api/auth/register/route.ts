import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { registerSchema } from '@/lib/validation/schemas';
import { logAudit, AuditActions } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { email, password, name } = result.data;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
            },
        });

        // Create default risk config
        await prisma.riskConfig.create({
            data: {
                userId: user.id,
                maxOrdersPerMinute: 10,
                maxDailyLoss: 1000,
                maxPositionSize: 500,
                maxTotalExposure: 5000,
                killSwitchActive: false,
            },
        });

        // Log registration
        await logAudit({
            userId: user.id,
            action: AuditActions.REGISTER,
            category: 'AUTH',
            details: { email },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json(
            { message: 'User registered successfully', userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
