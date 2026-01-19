import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Activity, DollarSign, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
}

export function StatsCard({
    title,
    value,
    change,
    changeLabel = 'from last period',
    icon,
    trend = 'neutral',
}: StatsCardProps) {
    const trendColors = {
        up: 'text-green-500',
        down: 'text-red-500',
        neutral: 'text-muted-foreground',
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon && <div className="text-muted-foreground">{icon}</div>}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {change !== undefined && (
                    <p className={cn('text-xs flex items-center gap-1 mt-1', trendColors[trend])}>
                        {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                        {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                        {change > 0 ? '+' : ''}{change.toFixed(2)}% {changeLabel}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

interface DashboardStatsProps {
    stats: {
        totalPnl: number;
        todayPnl: number;
        openPositions: number;
        activeStrategies: number;
        balance: number;
        volume: number;
    };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                title="Total P&L"
                value={`$${stats.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                change={5.2}
                trend={stats.totalPnl >= 0 ? 'up' : 'down'}
                icon={<DollarSign className="h-4 w-4" />}
            />
            <StatsCard
                title="Today's P&L"
                value={`$${stats.todayPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                trend={stats.todayPnl >= 0 ? 'up' : 'down'}
                icon={<Activity className="h-4 w-4" />}
            />
            <StatsCard
                title="Open Positions"
                value={stats.openPositions}
                icon={<Wallet className="h-4 w-4" />}
            />
            <StatsCard
                title="Active Strategies"
                value={stats.activeStrategies}
                icon={<BarChart3 className="h-4 w-4" />}
            />
        </div>
    );
}
