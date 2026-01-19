'use client';

import { Header } from '@/components/dashboard/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';

// Mock data
const mockOrders = [
    { id: '1', market: 'Trump wins 2024?', side: 'BUY', type: 'LIMIT', size: 100, price: 0.52, status: 'OPEN', time: '2m ago' },
    { id: '2', market: 'Fed rate cut Jan?', side: 'SELL', type: 'MARKET', size: 50, price: 0.38, status: 'FILLED', time: '15m ago' },
    { id: '3', market: 'Bitcoin $100k?', side: 'BUY', type: 'LIMIT', size: 200, price: 0.44, status: 'OPEN', time: '1h ago' },
    { id: '4', market: 'SpaceX success?', side: 'BUY', type: 'LIMIT', size: 75, price: 0.70, status: 'CANCELLED', time: '2h ago' },
];

export default function OrdersPage() {
    const openOrders = mockOrders.filter(o => o.status === 'OPEN');
    const filledOrders = mockOrders.filter(o => o.status === 'FILLED');
    const allOrders = mockOrders;

    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Orders" />

            <div className="flex-1 p-6">
                <Tabs defaultValue="open">
                    <TabsList>
                        <TabsTrigger value="open">Open ({openOrders.length})</TabsTrigger>
                        <TabsTrigger value="filled">Filled ({filledOrders.length})</TabsTrigger>
                        <TabsTrigger value="all">All Orders</TabsTrigger>
                    </TabsList>

                    <TabsContent value="open" className="mt-4 space-y-3">
                        {openOrders.map((order) => (
                            <OrderCard key={order.id} order={order} showCancel />
                        ))}
                        {openOrders.length === 0 && <EmptyState message="No open orders" />}
                    </TabsContent>

                    <TabsContent value="filled" className="mt-4 space-y-3">
                        {filledOrders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                        {filledOrders.length === 0 && <EmptyState message="No filled orders" />}
                    </TabsContent>

                    <TabsContent value="all" className="mt-4 space-y-3">
                        {allOrders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function OrderCard({ order, showCancel = false }: { order: typeof mockOrders[0]; showCancel?: boolean }) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    <Badge variant={order.side === 'BUY' ? 'default' : 'destructive'}>
                        {order.side}
                    </Badge>
                    <div>
                        <p className="font-medium">{order.market}</p>
                        <p className="text-sm text-muted-foreground">
                            {order.size} shares @ ${order.price.toFixed(2)} • {order.type}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <Badge variant={
                            order.status === 'OPEN' ? 'outline' :
                                order.status === 'FILLED' ? 'default' : 'secondary'
                        }>
                            {order.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{order.time}</p>
                    </div>
                    {showCancel && order.status === 'OPEN' && (
                        <Button size="sm" variant="ghost" className="text-red-500">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-12 text-muted-foreground">
            {message}
        </div>
    );
}
