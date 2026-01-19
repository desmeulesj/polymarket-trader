import { Header } from '@/components/dashboard/header';
import { DashboardStats } from '@/components/dashboard/stats-cards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';

// This would be fetched from API in a real implementation
const mockStats = {
    totalPnl: 1234.56,
    todayPnl: 87.32,
    openPositions: 5,
    activeStrategies: 3,
    balance: 8765.43,
    volume: 12500.00,
};

const recentActivity = [
    { id: 1, type: 'order', action: 'BUY', market: 'Trump wins 2024?', size: 100, price: 0.52, time: '5m ago' },
    { id: 2, type: 'strategy', action: 'RUN', name: 'Momentum Strategy', status: 'completed', time: '15m ago' },
    { id: 3, type: 'order', action: 'SELL', market: 'Fed rate cut Jan 2025?', size: 50, price: 0.38, time: '1h ago' },
];

export default function DashboardPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Dashboard" />

            <div className="flex-1 p-6 space-y-6">
                {/* Stats Grid */}
                <DashboardStats stats={mockStats} />

                {/* Main Content */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Activity */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Your latest trading activity</CardDescription>
                            </div>
                            <Link href="/dashboard/logs">
                                <Button variant="ghost" size="sm">
                                    View All <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivity.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'order'
                                                    ? item.action === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                    : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {item.type === 'order' ? <TrendingUp className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {item.type === 'order'
                                                        ? `${item.action} ${item.size} @ ${item.price}`
                                                        : `Strategy: ${item.name}`}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.type === 'order' ? item.market : item.status}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Common tasks and shortcuts</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <Link href="/dashboard/strategies/new">
                                <Button variant="outline" className="w-full justify-start">
                                    <Activity className="mr-2 h-4 w-4" />
                                    Create New Strategy
                                </Button>
                            </Link>
                            <Link href="/dashboard/markets">
                                <Button variant="outline" className="w-full justify-start">
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    Browse Markets
                                </Button>
                            </Link>
                            <Link href="/dashboard/risk">
                                <Button variant="outline" className="w-full justify-start">
                                    <Activity className="mr-2 h-4 w-4" />
                                    Risk Management
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Strategies */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Active Strategies</CardTitle>
                            <CardDescription>Currently running trading strategies</CardDescription>
                        </div>
                        <Link href="/dashboard/strategies">
                            <Button variant="ghost" size="sm">
                                Manage <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { name: 'Momentum Strategy', status: 'running', pnl: 234.50, trades: 12 },
                                { name: 'Market Maker', status: 'running', pnl: -45.20, trades: 48 },
                                { name: 'Arbitrage Bot', status: 'paused', pnl: 567.80, trades: 24 },
                            ].map((strategy, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <Badge variant={strategy.status === 'running' ? 'default' : 'secondary'}>
                                            {strategy.status}
                                        </Badge>
                                        <span className="font-medium">{strategy.name}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className={`text-sm font-medium ${strategy.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {strategy.pnl >= 0 ? '+' : ''}${strategy.pnl.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{strategy.trades} trades</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
