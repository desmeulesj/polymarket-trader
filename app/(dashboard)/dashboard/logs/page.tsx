'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Activity, Shield, Zap, User, AlertTriangle, Terminal } from 'lucide-react';
// import { formatDistanceToNow } from 'date-fns'; // Would need date-fns, but using simple formatter for now

const categoryColors: Record<string, string> = {
    TRADING: 'bg-blue-500/10 text-blue-500',
    STRATEGY: 'bg-purple-500/10 text-purple-500',
    AUTH: 'bg-green-500/10 text-green-500',
    RISK: 'bg-orange-500/10 text-orange-500',
    SETTINGS: 'bg-gray-500/10 text-gray-500',
    SYSTEM: 'bg-red-500/10 text-red-500',
};

const categoryIcons: Record<string, any> = {
    TRADING: Activity,
    STRATEGY: Zap,
    AUTH: User,
    RISK: Shield,
    SETTINGS: Terminal,
    SYSTEM: AlertTriangle,
};

interface LogEntry {
    id: string;
    action: string;
    category: string;
    details: any;
    createdAt: string;
}

export default function LogsPage() {
    const [search, setSearch] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch('/api/logs');
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                }
            } catch (error) {
                console.error('Failed to fetch logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase())
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
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4 space-y-2">
                        {loading ? <p>Loading logs...</p> : filteredLogs.map((log) => (
                            <LogItem key={log.id} log={log} />
                        ))}
                        {!loading && filteredLogs.length === 0 && <p className="text-muted-foreground">No logs found.</p>}
                    </TabsContent>

                    {['trading', 'strategy', 'risk', 'auth', 'settings'].map((category) => (
                        <TabsContent key={category} value={category} className="mt-4 space-y-2">
                            {filteredLogs
                                .filter((log) => log.category.toLowerCase() === category)
                                .map((log) => (
                                    <LogItem key={log.id} log={log} />
                                ))}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}

function LogItem({ log }: { log: LogEntry }) {
    const Icon = categoryIcons[log.category] || Activity;
    const formattedDate = new Date(log.createdAt).toLocaleString();

    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 w-full">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${categoryColors[log.category] || 'bg-muted'}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start">
                            <p className="font-medium">{log.action}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formattedDate}</span>
                        </div>
                        <pre className="text-xs text-muted-foreground mt-1 bg-slate-100 dark:bg-slate-900 p-2 rounded overflow-x-auto">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                        </pre>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
