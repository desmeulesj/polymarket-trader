import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { logAudit, AuditActions } from '@/lib/audit/logger';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            name?: string;
        };
    }
    interface User {
        id: string;
        email: string;
        name?: string;
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user) {
                    return null;
                }

                const isValidPassword = await bcrypt.compare(password, user.passwordHash);

                if (!isValidPassword) {
                    return null;
                }

                // Log successful login
                await logAudit({
                    userId: user.id,
                    action: AuditActions.LOGIN,
                    category: 'AUTH',
                    details: { email: user.email },
                });

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name || undefined,
                };
            },
        }),
    ],
});
