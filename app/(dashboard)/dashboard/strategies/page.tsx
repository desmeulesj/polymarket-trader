'use client';

import { useEffect, useState } from 'react';
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

interface Strategy {
    id: string;
    name: string;
    description: string | null;
    version: number;
    isActive: boolean;
    _count?: { runs: number };
}

export default function StrategiesPage() {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStrategies = async () => {
        try {
            const response = await fetch('/api/strategies');
            if (!response.ok) throw new Error('Failed to fetch strategies');
            const data = await response.json();
            setStrategies(data.strategies || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load strategies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStrategies();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this strategy?')) return;

        try {
            const response = await fetch(`/api/strategies/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');
            setStrategies(strategies.filter(s => s.id !== id));
        } catch (err) {
            alert('Failed to delete strategy');
        }
    };

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

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        Loading strategies...
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Strategies List */}
                {!loading && strategies.length > 0 && (
                    <div className="space-y-3">
                        {strategies.map((strategy) => (
                            <Card key={strategy.id}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${strategy.isActive
                                                ? 'bg-green-500/10 text-green-500'
                                                : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {strategy.isActive ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium">{strategy.name}</h3>
                                                <Badge variant="outline" className="text-xs">v{strategy.version}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {strategy._count?.runs || 0} runs • {strategy.isActive ? 'Active' : 'Inactive'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link href={`/dashboard/strategies/${strategy.id}`}>
                                            <Button size="sm" variant="outline">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </Link>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" variant="ghost">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/strategies/${strategy.id}`}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-500"
                                                    onClick={() => handleDelete(strategy.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && strategies.length === 0 && !error && (
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
