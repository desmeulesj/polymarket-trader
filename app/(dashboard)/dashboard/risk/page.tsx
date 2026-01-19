'use client';

import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { KillSwitch } from '@/components/risk/kill-switch';
import { AlertTriangle, Shield } from 'lucide-react';

export default function RiskPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Risk Management" />

            <div className="flex-1 p-6 space-y-6">
                {/* Kill Switch */}
                <KillSwitch />

                {/* Risk Limits */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-500" />
                            <CardTitle>Risk Limits</CardTitle>
                        </div>
                        <CardDescription>
                            Configure your trading limits to protect your capital
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="maxOrdersPerMinute">Max Orders per Minute</Label>
                                <Input id="maxOrdersPerMinute" type="number" defaultValue={10} />
                                <p className="text-xs text-muted-foreground">
                                    Maximum number of orders that can be placed per minute
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxDailyLoss">Max Daily Loss ($)</Label>
                                <Input id="maxDailyLoss" type="number" defaultValue={1000} />
                                <p className="text-xs text-muted-foreground">
                                    Kill switch activates if daily loss exceeds this amount
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxPositionSize">Max Position Size ($)</Label>
                                <Input id="maxPositionSize" type="number" defaultValue={500} />
                                <p className="text-xs text-muted-foreground">
                                    Maximum size for any single position
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxTotalExposure">Max Total Exposure ($)</Label>
                                <Input id="maxTotalExposure" type="number" defaultValue={5000} />
                                <p className="text-xs text-muted-foreground">
                                    Maximum total capital at risk across all positions
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-end">
                            <Button>Save Changes</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Warning */}
                <Card className="border-yellow-500/20 bg-yellow-500/5">
                    <CardContent className="flex items-start gap-3 pt-6">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                            <p className="font-medium text-yellow-600 dark:text-yellow-500">
                                Risk Management Notice
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Risk limits help protect your capital but cannot guarantee against all losses.
                                Trading on prediction markets involves substantial risk. Only trade with funds
                                you can afford to lose.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
