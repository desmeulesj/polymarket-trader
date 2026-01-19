'use client';

import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Mock data
const mockPositions = [
    { id: '1', market: 'Trump wins 2024?', outcome: 'Yes', size: 150, avgPrice: 0.48, currentPrice: 0.52, pnl: 6.00 },
    { id: '2', market: 'Fed rate cut Jan?', outcome: 'No', size: 100, avgPrice: 0.65, currentPrice: 0.62, pnl: -3.00 },
    { id: '3', market: 'Bitcoin $100k?', outcome: 'Yes', size: 200, avgPrice: 0.42, currentPrice: 0.45, pnl: 6.00 },
];

export default function PositionsPage() {
    const totalPnl = mockPositions.reduce((sum, p) => sum + p.pnl, 0);
    const totalValue = mockPositions.reduce((sum, p) => sum + (p.size * p.currentPrice), 0);

    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Positions" />

            <div className="flex-1 p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Positions</CardDescription>
                            <CardTitle className="text-2xl">{mockPositions.length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Value</CardDescription>
                            <CardTitle className="text-2xl">${totalValue.toFixed(2)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Unrealized P&L</CardDescription>
                            <CardTitle className={`text-2xl ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* Positions List */}
                <div className="space-y-3">
                    {mockPositions.map((position) => (
                        <Card key={position.id}>
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${position.pnl >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        {position.pnl >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="font-medium">{position.market}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Badge variant="outline">{position.outcome}</Badge>
                                            <span>{position.size} shares</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Avg Price</p>
                                        <p className="font-medium">${position.avgPrice.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Current</p>
                                        <p className="font-medium">${position.currentPrice.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right min-w-[80px]">
                                        <p className="text-sm text-muted-foreground">P&L</p>
                                        <p className={`font-medium ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {mockPositions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No open positions
                    </div>
                )}
            </div>
        </div>
    );
}
