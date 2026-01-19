'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StrategyEditor, DEFAULT_STRATEGY_CODE } from '@/components/strategies/strategy-editor';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewStrategyPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [code, setCode] = useState(DEFAULT_STRATEGY_CODE);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Strategy name is required');
            return;
        }
        if (code.length < 50) {
            setError('Strategy code must be at least 50 characters');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/strategies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    code,
                    parameters: {},
                    marketIds: [],
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create strategy');
            }

            router.push('/dashboard/strategies');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create strategy');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header title="New Strategy" />

            <div className="flex-1 p-6 space-y-6">
                {/* Back button */}
                <Link href="/dashboard/strategies" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Strategies
                </Link>

                {/* Strategy Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Strategy Details</CardTitle>
                        <CardDescription>Give your strategy a name and description</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Momentum Strategy"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this strategy does..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Strategy Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Strategy Code</CardTitle>
                        <CardDescription>Write your Python strategy code</CardDescription>
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
                        {saving ? 'Saving...' : 'Create Strategy'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
