'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StrategyEditor } from '@/components/strategies/strategy-editor';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Strategy {
    id: string;
    name: string;
    description: string | null;
    code: string;
    version: number;
}

export default function EditStrategyPage() {
    const router = useRouter();
    const params = useParams();
    const strategyId = params.id as string;

    const [strategy, setStrategy] = useState<Strategy | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [code, setCode] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStrategy = async () => {
            try {
                const response = await fetch(`/api/strategies/${strategyId}`);
                if (!response.ok) throw new Error('Strategy not found');
                const data = await response.json();
                setStrategy(data.strategy);
                setName(data.strategy.name);
                setDescription(data.strategy.description || '');
                setCode(data.strategy.code);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load strategy');
            } finally {
                setLoading(false);
            }
        };
        fetchStrategy();
    }, [strategyId]);

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Strategy name is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/strategies/${strategyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, code }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update strategy');
            }

            router.push('/dashboard/strategies');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update strategy');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this strategy?')) return;

        setDeleting(true);
        try {
            const response = await fetch(`/api/strategies/${strategyId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete strategy');
            }

            router.push('/dashboard/strategies');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete strategy');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header title="Edit Strategy" />
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!strategy) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header title="Edit Strategy" />
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <p className="text-muted-foreground">Strategy not found</p>
                    <Link href="/dashboard/strategies">
                        <Button variant="outline">Back to Strategies</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header title={`Edit: ${strategy.name}`} />

            <div className="flex-1 p-6 space-y-6">
                {/* Back button */}
                <Link href="/dashboard/strategies" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Strategies
                </Link>

                {/* Strategy Details */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Strategy Details</CardTitle>
                                <CardDescription>Version {strategy.version}</CardDescription>
                            </div>
                            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Strategy Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Strategy Code</CardTitle>
                        <CardDescription>Edit your Python strategy code</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[500px]">
                            <StrategyEditor
                                initialCode={code}
                                onChange={setCode}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Error message */}
                {error && (
                    <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Link href="/dashboard/strategies">
                        <Button variant="outline">Cancel</Button>
                    </Link>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
