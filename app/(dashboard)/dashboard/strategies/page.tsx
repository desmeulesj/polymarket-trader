'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Pause, Edit, Trash2, MoreVertical } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

// Mock data
const mockStrategies = [
    { id: '1', name: 'Momentum Strategy', status: 'running', pnl: 234.50, trades: 12, version: 3 },
    { id: '2', name: 'Market Maker', status: 'running', pnl: -45.20, trades: 48, version: 1 },
    { id: '3', name: 'Arbitrage Bot', status: 'paused', pnl: 567.80, trades: 24, version: 2 },
    { id: '4', name: 'Mean Reversion', status: 'stopped', pnl: 0, trades: 0, version: 1 },
];

export default function StrategiesPage() {
    const [strategies] = useState(mockStrategies);

    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Strategies" />

            <div className="flex-1 p-6 space-y-6">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Your Strategies</h2>
                        <p className="text-sm text-muted-foreground">Manage and run your trading strategies</p>
                    </div>
                    <Link href="/dashboard/strategies/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Strategy
                        </Button>
                    </Link>
                </div>

                {/* Strategies List */}
                <div className="space-y-3">
                    {strategies.map((strategy) => (
                        <Card key={strategy.id}>
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${strategy.status === 'running' ? 'bg-green-500/10 text-green-500' :
                                            strategy.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500' :
                                                'bg-muted text-muted-foreground'
                                        }`}>
                                        {strategy.status === 'running' ? <Play className="h-5 w-5" /> :
                                            strategy.status === 'paused' ? <Pause className="h-5 w-5" /> :
                                                <Play className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium">{strategy.name}</h3>
                                            <Badge variant="outline" className="text-xs">v{strategy.version}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {strategy.trades} trades • {strategy.status}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className={`font-medium ${strategy.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {strategy.pnl >= 0 ? '+' : ''}${strategy.pnl.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">P&L</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {strategy.status !== 'running' ? (
                                            <Button size="sm" variant="outline">
                                                <Play className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline">
                                                <Pause className="h-4 w-4" />
                                            </Button>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" variant="ghost">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {strategies.length === 0 && (
                    <Card className="p-12 text-center">
                        <CardHeader>
                            <CardTitle>No strategies yet</CardTitle>
                            <CardDescription>Create your first trading strategy to get started</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/dashboard/strategies/new">
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Strategy
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
