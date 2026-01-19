'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Activity, Shield, Zap, User } from 'lucide-react';

// Mock data
const mockLogs = [
    { id: '1', action: 'Order Placed', category: 'TRADING', details: 'BUY 100 @ $0.52', time: '2m ago', icon: Activity },
    { id: '2', action: 'Strategy Run', category: 'STRATEGY', details: 'Momentum Strategy completed', time: '15m ago', icon: Zap },
    { id: '3', action: 'Login', category: 'AUTH', details: 'Successful login from 192.168.1.1', time: '1h ago', icon: User },
    { id: '4', action: 'Risk Config Updated', category: 'RISK', details: 'Max daily loss changed to $1000', time: '2h ago', icon: Shield },
    { id: '5', action: 'Order Filled', category: 'TRADING', details: 'SELL 50 @ $0.38', time: '3h ago', icon: Activity },
];

const categoryColors: Record<string, string> = {
    TRADING: 'bg-blue-500/10 text-blue-500',
    STRATEGY: 'bg-purple-500/10 text-purple-500',
    AUTH: 'bg-green-500/10 text-green-500',
    RISK: 'bg-orange-500/10 text-orange-500',
    SYSTEM: 'bg-gray-500/10 text-gray-500',
};

export default function LogsPage() {
    const [search, setSearch] = useState('');
    const [logs] = useState(mockLogs);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Audit Logs" />

            <div className="flex-1 p-6 space-y-6">
                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Tabs */}
                <Tabs defaultValue="all">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="trading">Trading</TabsTrigger>
                        <TabsTrigger value="strategy">Strategy</TabsTrigger>
                        <TabsTrigger value="risk">Risk</TabsTrigger>
                        <TabsTrigger value="auth">Auth</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4 space-y-2">
                        {filteredLogs.map((log) => (
                            <LogEntry key={log.id} log={log} />
                        ))}
                    </TabsContent>

                    {['trading', 'strategy', 'risk', 'auth'].map((category) => (
                        <TabsContent key={category} value={category} className="mt-4 space-y-2">
                            {filteredLogs
                                .filter((log) => log.category.toLowerCase() === category)
                                .map((log) => (
                                    <LogEntry key={log.id} log={log} />
                                ))}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}

function LogEntry({ log }: { log: typeof mockLogs[0] }) {
    const Icon = log.icon;

    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${categoryColors[log.category] || 'bg-muted'}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="font-medium">{log.action}</p>
                        <p className="text-sm text-muted-foreground">{log.details}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline">{log.category}</Badge>
                    <span className="text-sm text-muted-foreground">{log.time}</span>
                </div>
            </CardContent>
        </Card>
    );
}
