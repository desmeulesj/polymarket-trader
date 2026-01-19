import prisma from '@/lib/db';
import { AuditCategory } from '@/lib/types';

export interface AuditLogEntry {
    userId: string;
    action: string;
    category: AuditCategory;
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Create an immutable audit log entry
 * These logs are append-only and cannot be modified or deleted
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: entry.userId,
                action: entry.action,
                category: entry.category,
                details: entry.details,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
            },
        });
    } catch (error) {
        // Log to console but don't throw - audit logging should not break operations
        console.error('[AUDIT] Failed to create audit log:', error);
    }
}

// ============================================================================
// Audit Action Helpers
// ============================================================================

export const AuditActions = {
    // Auth
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    REGISTER: 'auth.register',
    PASSWORD_CHANGE: 'auth.password_change',

    // Trading
    ORDER_PLACED: 'trading.order_placed',
    ORDER_CANCELLED: 'trading.order_cancelled',
    ORDER_FILLED: 'trading.order_filled',
    ORDER_FAILED: 'trading.order_failed',
    MODE_CHANGED: 'trading.mode_changed',

    // Strategy
    STRATEGY_CREATED: 'strategy.created',
    STRATEGY_UPDATED: 'strategy.updated',
    STRATEGY_DELETED: 'strategy.deleted',
    STRATEGY_RUN_STARTED: 'strategy.run_started',
    STRATEGY_RUN_COMPLETED: 'strategy.run_completed',
    STRATEGY_RUN_FAILED: 'strategy.run_failed',

    // Risk
    RISK_CONFIG_UPDATED: 'risk.config_updated',
    KILL_SWITCH_ACTIVATED: 'risk.kill_switch_activated',
    KILL_SWITCH_DEACTIVATED: 'risk.kill_switch_deactivated',
    RISK_LIMIT_TRIGGERED: 'risk.limit_triggered',

    // Settings
    CREDENTIALS_UPDATED: 'settings.credentials_updated',
    CREDENTIALS_VERIFIED: 'settings.credentials_verified',

    // System
    CRON_EXECUTED: 'system.cron_executed',
    ERROR: 'system.error',
} as const;

// ============================================================================
// Convenience Functions
// ============================================================================

export async function logOrderPlaced(
    userId: string,
    orderId: string,
    orderDetails: Record<string, unknown>,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        action: AuditActions.ORDER_PLACED,
        category: 'TRADING',
        details: { orderId, ...orderDetails },
        ipAddress,
    });
}

export async function logModeChange(
    userId: string,
    fromMode: string,
    toMode: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        action: AuditActions.MODE_CHANGED,
        category: 'TRADING',
        details: { fromMode, toMode },
        ipAddress,
    });
}

export async function logStrategyRun(
    userId: string,
    strategyId: string,
    runId: string,
    status: 'started' | 'completed' | 'failed',
    details?: Record<string, unknown>,
    ipAddress?: string
): Promise<void> {
    const action = status === 'started'
        ? AuditActions.STRATEGY_RUN_STARTED
        : status === 'completed'
            ? AuditActions.STRATEGY_RUN_COMPLETED
            : AuditActions.STRATEGY_RUN_FAILED;

    await logAudit({
        userId,
        action,
        category: 'STRATEGY',
        details: { strategyId, runId, ...details },
        ipAddress,
    });
}

export async function logKillSwitch(
    userId: string,
    activated: boolean,
    reason?: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        action: activated ? AuditActions.KILL_SWITCH_ACTIVATED : AuditActions.KILL_SWITCH_DEACTIVATED,
        category: 'RISK',
        details: { reason },
        ipAddress,
    });
}
