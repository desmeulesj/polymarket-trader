'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, AlertTriangle, TestTube2, Radio, Eye } from 'lucide-react';

type TradingMode = 'PAPER' | 'LIVE' | 'SHADOW';

interface ModeToggleProps {
    initialMode?: TradingMode;
    onModeChange?: (mode: TradingMode) => void;
    disabled?: boolean;
}

const modeConfig = {
    PAPER: {
        label: 'Paper Trading',
        description: 'Simulated trading with virtual funds',
        icon: TestTube2,
        color: 'bg-blue-500',
        textColor: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500',
    },
    LIVE: {
        label: 'Live Trading',
        description: 'Real trades on Polymarket',
        icon: Radio,
        color: 'bg-green-500',
        textColor: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500',
    },
    SHADOW: {
        label: 'Shadow Trading',
        description: 'Live data, no real orders',
        icon: Eye,
        color: 'bg-purple-500',
        textColor: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500',
    },
};

export function ModeToggle({
    initialMode = 'PAPER',
    onModeChange,
    disabled = false,
}: ModeToggleProps) {
    const [mode, setMode] = useState<TradingMode>(initialMode);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingMode, setPendingMode] = useState<TradingMode | null>(null);

    const config = modeConfig[mode];
    const Icon = config.icon;

    const handleModeSelect = (newMode: TradingMode) => {
        if (newMode === mode) return;

        if (newMode === 'LIVE') {
            setPendingMode(newMode);
            setShowConfirm(true);
        } else {
            setMode(newMode);
            onModeChange?.(newMode);
        }
    };

    const confirmModeChange = () => {
        if (pendingMode) {
            setMode(pendingMode);
            onModeChange?.(pendingMode);
            setPendingMode(null);
            setShowConfirm(false);
        }
    };

    return (
        <div className="relative">
            <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={disabled}>
                    <Button
                        variant="outline"
                        className={`min-w-[200px] justify-between ${config.borderColor} ${config.bgColor}`}
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
                            <Icon className={`h-4 w-4 ${config.textColor}`} />
                            <span className={config.textColor}>{config.label}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px]">
                    {Object.entries(modeConfig).map(([key, cfg]) => {
                        const ModeIcon = cfg.icon;
                        return (
                            <DropdownMenuItem
                                key={key}
                                onClick={() => handleModeSelect(key as TradingMode)}
                                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${mode === key ? cfg.bgColor : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <ModeIcon className={`h-4 w-4 ${cfg.textColor}`} />
                                    <span className="font-medium">{cfg.label}</span>
                                    {mode === key && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            Active
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground pl-6">
                                    {cfg.description}
                                </span>
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Live Mode Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 max-w-md mx-4 border shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="h-8 w-8 text-yellow-500" />
                            <h2 className="text-lg font-semibold">Switch to Live Trading?</h2>
                        </div>
                        <p className="text-muted-foreground mb-4">
                            You are about to enable <strong>live trading</strong>. Real money will be
                            used for all trades. Make sure you understand the risks.
                        </p>
                        <ul className="text-sm text-muted-foreground mb-6 space-y-1">
                            <li>• Orders will be sent to Polymarket</li>
                            <li>• Real funds will be at risk</li>
                            <li>• All trades are logged for audit</li>
                        </ul>
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowConfirm(false);
                                    setPendingMode(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmModeChange}
                            >
                                Enable Live Trading
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ModeIndicator({ mode }: { mode: TradingMode }) {
    const config = modeConfig[mode];
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${config.borderColor} border`}>
            <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
            <Icon className={`h-4 w-4 ${config.textColor}`} />
            <span className={`text-sm font-medium ${config.textColor}`}>
                {config.label}
            </span>
        </div>
    );
}
