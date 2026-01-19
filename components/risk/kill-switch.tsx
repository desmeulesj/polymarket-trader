'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertTriangle,
    Power,
    ShieldAlert,
    AlertCircle,
} from 'lucide-react';

interface KillSwitchProps {
    isActive: boolean;
    reason?: string;
    activatedAt?: string;
    onToggle: (active: boolean, reason?: string) => Promise<void>;
}

export function KillSwitch({
    isActive,
    reason,
    activatedAt,
    onToggle
}: KillSwitchProps) {
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate'>('activate');

    const handleToggle = async () => {
        if (isActive) {
            setConfirmAction('deactivate');
        } else {
            setConfirmAction('activate');
        }
        setShowConfirm(true);
    };

    const confirmToggle = async () => {
        setLoading(true);
        try {
            await onToggle(!isActive, confirmAction === 'activate' ? 'Manual activation' : undefined);
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <Card className={isActive ? 'border-red-500 bg-red-500/5' : ''}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className={`h-5 w-5 ${isActive ? 'text-red-500' : 'text-muted-foreground'}`} />
                            <CardTitle className="text-lg">Kill Switch</CardTitle>
                        </div>
                        <Badge variant={isActive ? 'destructive' : 'secondary'}>
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Emergency stop for all live trading. When active, no orders will be sent
                        to Polymarket and all open orders will be cancelled.
                    </p>

                    {isActive && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Kill Switch Active</AlertTitle>
                            <AlertDescription>
                                {reason && <p>Reason: {reason}</p>}
                                {activatedAt && (
                                    <p className="text-xs mt-1">
                                        Activated: {new Date(activatedAt).toLocaleString()}
                                    </p>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                            <Power className={`h-4 w-4 ${isActive ? 'text-red-500' : ''}`} />
                            <span className="text-sm font-medium">
                                {isActive ? 'Disable Kill Switch' : 'Enable Kill Switch'}
                            </span>
                        </div>
                        <Switch
                            checked={isActive}
                            onCheckedChange={handleToggle}
                            disabled={loading}
                            className={isActive ? 'data-[state=checked]:bg-red-500' : ''}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 max-w-md mx-4 border shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className={`h-8 w-8 ${confirmAction === 'activate' ? 'text-red-500' : 'text-yellow-500'}`} />
                            <h2 className="text-lg font-semibold">
                                {confirmAction === 'activate' ? 'Activate Kill Switch?' : 'Deactivate Kill Switch?'}
                            </h2>
                        </div>

                        {confirmAction === 'activate' ? (
                            <p className="text-muted-foreground mb-6">
                                This will immediately stop all live trading activity and cancel all
                                open orders on Polymarket.
                            </p>
                        ) : (
                            <p className="text-muted-foreground mb-6">
                                This will re-enable live trading. Make sure you understand the risks
                                before proceeding.
                            </p>
                        )}

                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant={confirmAction === 'activate' ? 'destructive' : 'default'}
                                onClick={confirmToggle}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
