'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { User, Key, Bell, Palette, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
    // Credentials state
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [savingCredentials, setSavingCredentials] = useState(false);
    const [credentialsStatus, setCredentialsStatus] = useState<{
        hasCredentials: boolean;
        isConnected: boolean;
        walletAddress: string | null;
    } | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch credentials status on mount
    useEffect(() => {
        const fetchCredentialsStatus = async () => {
            try {
                const response = await fetch('/api/credentials');
                if (response.ok) {
                    const data = await response.json();
                    setCredentialsStatus(data);
                    if (data.walletAddress) {
                        setWalletAddress(data.walletAddress);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch credentials status:', error);
            }
        };
        fetchCredentialsStatus();
    }, []);

    const handleSaveCredentials = async () => {
        if (!apiKey || !apiSecret || !passphrase) {
            setMessage({ type: 'error', text: 'All credential fields are required' });
            return;
        }

        setSavingCredentials(true);
        setMessage(null);

        try {
            const response = await fetch('/api/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    apiSecret,
                    passphrase,
                    walletAddress: walletAddress || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save credentials');
            }

            setMessage({ type: 'success', text: 'Credentials saved successfully!' });
            setCredentialsStatus({
                hasCredentials: true,
                isConnected: false,
                walletAddress: walletAddress || null,
            });

            // Clear sensitive fields after save
            setApiKey('');
            setApiSecret('');
            setPassphrase('');
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to save credentials'
            });
        } finally {
            setSavingCredentials(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Settings" />

            <div className="flex-1 p-6 space-y-6 max-w-3xl">
                {/* Profile */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            <CardTitle>Profile</CardTitle>
                        </div>
                        <CardDescription>Your account information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input id="name" placeholder="Your name" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="you@example.com" disabled />
                            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                        </div>
                        <Button>Update Profile</Button>
                    </CardContent>
                </Card>

                {/* API Credentials */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                <CardTitle>Polymarket Credentials</CardTitle>
                            </div>
                            {credentialsStatus?.hasCredentials && (
                                <Badge variant={credentialsStatus.isConnected ? 'default' : 'secondary'}>
                                    {credentialsStatus.isConnected ? (
                                        <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                                    ) : (
                                        <><XCircle className="h-3 w-3 mr-1" /> Not Verified</>
                                    )}
                                </Badge>
                            )}
                        </div>
                        <CardDescription>Connect your Polymarket account for live trading</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Message */}
                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'success'
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-red-500/10 text-red-500'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="walletAddress">Wallet Address (optional)</Label>
                            <Input
                                id="walletAddress"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                placeholder="0x..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key *</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={credentialsStatus?.hasCredentials ? '••••••••••••••••' : 'Enter your API key'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="apiSecret">API Secret *</Label>
                            <Input
                                id="apiSecret"
                                type="password"
                                value={apiSecret}
                                onChange={(e) => setApiSecret(e.target.value)}
                                placeholder={credentialsStatus?.hasCredentials ? '••••••••••••••••' : 'Enter your API secret'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="passphrase">Passphrase *</Label>
                            <Input
                                id="passphrase"
                                type="password"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                placeholder={credentialsStatus?.hasCredentials ? '••••••••••••••••' : 'Enter your passphrase'}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSaveCredentials} disabled={savingCredentials}>
                                {savingCredentials ? 'Saving...' : 'Save Credentials'}
                            </Button>
                            <Button variant="outline" disabled>Test Connection</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            <CardTitle>Notifications</CardTitle>
                        </div>
                        <CardDescription>Configure how you receive alerts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Order Notifications</p>
                                <p className="text-sm text-muted-foreground">Get notified when orders are filled</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Strategy Alerts</p>
                                <p className="text-sm text-muted-foreground">Alerts when strategies complete or fail</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Risk Warnings</p>
                                <p className="text-sm text-muted-foreground">Critical alerts for risk limit breaches</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            <CardTitle>Appearance</CardTitle>
                        </div>
                        <CardDescription>Customize the look and feel</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Dark Mode</p>
                                <p className="text-sm text-muted-foreground">Use dark theme</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
