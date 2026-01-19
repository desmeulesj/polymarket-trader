'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, Clock, DollarSign } from 'lucide-react';

// Mock data - would be fetched from API
const mockMarkets = [
    { id: '1', title: 'Will Trump win 2024?', volume: 1250000, liquidity: 450000, endDate: '2024-11-05', price: 0.52 },
    { id: '2', title: 'Fed rate cut January 2025?', volume: 890000, liquidity: 320000, endDate: '2025-01-31', price: 0.38 },
    { id: '3', title: 'Bitcoin above $100k by EOY?', volume: 2100000, liquidity: 780000, endDate: '2024-12-31', price: 0.45 },
    { id: '4', title: 'Ukraine ceasefire 2025?', volume: 560000, liquidity: 210000, endDate: '2025-06-30', price: 0.28 },
    { id: '5', title: 'SpaceX Starship success?', volume: 340000, liquidity: 120000, endDate: '2024-12-31', price: 0.72 },
];

export default function MarketsPage() {
    const [search, setSearch] = useState('');
    const [markets] = useState(mockMarkets);

    const filteredMarkets = markets.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Markets" />

            <div className="flex-1 p-6 space-y-6">
                {/* Search */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search markets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button variant="outline">Filters</Button>
                </div>

                {/* Markets Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredMarkets.map((market) => (
                        <Card key={market.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base line-clamp-2">{market.title}</CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Ends {new Date(market.endDate).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-3xl font-bold">
                                        {(market.price * 100).toFixed(0)}¢
                                    </div>
                                    <Badge variant={market.price > 0.5 ? 'default' : 'secondary'}>
                                        {market.price > 0.5 ? 'Yes favored' : 'No favored'}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        ${(market.volume / 1000000).toFixed(2)}M vol
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        ${(market.liquidity / 1000).toFixed(0)}k liq
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredMarkets.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No markets found matching "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}
