'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Save, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface StrategyEditorProps {
    initialCode?: string;
    onChange?: (code: string) => void;
    onSave?: (code: string) => Promise<void>;
    onDryRun?: (code: string) => Promise<{ success: boolean; logs: string; error?: string }>;
    readOnly?: boolean;
}

const DEFAULT_STRATEGY_CODE = `"""
Example Strategy: Simple Momentum
This strategy buys when the price is below 0.5 and sells when above 0.7
"""

def initialize(config: dict) -> None:
    """
    Called once when the strategy is loaded.
    Use this for any setup that needs to happen before trading.
    """
    print(f"Strategy initialized with config: {config}")

def on_tick(market_state: dict) -> None:
    """
    Called on each market update (price change, new trade, etc.)
    Use this for real-time logic, not for placing orders.
    
    market_state contains:
    - market_id: str
    - token_id: str
    - bid: float
    - ask: float
    - midpoint: float
    - spread: float
    - volume: float
    """
    pass  # Optional: implement real-time logic

def propose_orders(context: dict) -> list:
    """
    Called periodically to generate order proposals.
    Return a list of order dictionaries.
    
    context contains:
    - mode: 'PAPER' | 'LIVE' | 'SHADOW'
    - positions: list of current positions
    - balance: available balance
    - market_data: dict of market_id -> market_state
    - parameters: strategy parameters
    
    Each order should be a dict with:
    - market_id: str
    - token_id: str
    - side: 'BUY' | 'SELL'
    - type: 'MARKET' | 'LIMIT' | 'GTC'
    - size: float
    - price: float (optional for MARKET orders)
    """
    orders = []
    
    # Get strategy parameters
    target_markets = context.get('parameters', {}).get('market_ids', [])
    position_size = context.get('parameters', {}).get('position_size', 10)
    
    for market_id in target_markets:
        market = context.get('market_data', {}).get(market_id)
        if not market:
            continue
            
        current_position = next(
            (p for p in context.get('positions', []) if p['market_id'] == market_id),
            None
        )
        
        midpoint = market.get('midpoint', 0.5)
        
        # Simple momentum logic
        if midpoint < 0.5 and not current_position:
            # Price is low, buy
            orders.append({
                'market_id': market_id,
                'token_id': market.get('token_id'),
                'side': 'BUY',
                'type': 'LIMIT',
                'size': position_size,
                'price': midpoint + 0.01,  # Slightly above midpoint
            })
        elif midpoint > 0.7 and current_position:
            # Price is high, sell
            orders.append({
                'market_id': market_id,
                'token_id': market.get('token_id'),
                'side': 'SELL',
                'type': 'MARKET',
                'size': current_position.get('size', 0),
            })
    
    return orders

def risk_check(order: dict, context: dict) -> bool:
    """
    Called before each order is placed.
    Return True to allow the order, False to block it.
    
    Use this for additional risk checks beyond global limits.
    """
    # Check order size isn't too large
    max_order_size = context.get('parameters', {}).get('max_order_size', 100)
    if order.get('size', 0) > max_order_size:
        print(f"Order blocked: size {order['size']} exceeds max {max_order_size}")
        return False
    
    # Check we have sufficient balance
    balance = context.get('balance', 0)
    order_value = order.get('size', 0) * order.get('price', 0.5)
    if order.get('side') == 'BUY' and order_value > balance:
        print(f"Order blocked: insufficient balance")
        return False
    
    return True
`;

export function StrategyEditor({
    initialCode = DEFAULT_STRATEGY_CODE,
    onChange,
    onSave,
    onDryRun,
    readOnly = false,
}: StrategyEditorProps) {
    const [code, setCode] = useState(initialCode);
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);
    const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'unknown'>('unknown');
    const [dryRunResult, setDryRunResult] = useState<{ success: boolean; logs: string; error?: string } | null>(null);
    const editorRef = useRef<any>(null);

    const handleEditorMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const handleBeforeMount: BeforeMount = (monaco) => {
        // Register Python language features
        monaco.languages.registerCompletionItemProvider('python', {
            provideCompletionItems: (model: Parameters<Parameters<typeof monaco.languages.registerCompletionItemProvider>[1]['provideCompletionItems']>[0], position: Parameters<Parameters<typeof monaco.languages.registerCompletionItemProvider>[1]['provideCompletionItems']>[1]) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions = [
                    { label: 'context', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'context', range },
                    { label: 'market_data', kind: monaco.languages.CompletionItemKind.Property, insertText: "context.get('market_data', {})", range },
                    { label: 'positions', kind: monaco.languages.CompletionItemKind.Property, insertText: "context.get('positions', [])", range },
                    { label: 'balance', kind: monaco.languages.CompletionItemKind.Property, insertText: "context.get('balance', 0)", range },
                    { label: 'mode', kind: monaco.languages.CompletionItemKind.Property, insertText: "context.get('mode')", range },
                    { label: 'parameters', kind: monaco.languages.CompletionItemKind.Property, insertText: "context.get('parameters', {})", range },
                ];

                return { suggestions };
            },
        });
    };

    const handleCodeChange = (value: string | undefined) => {
        const newCode = value || '';
        setCode(newCode);
        onChange?.(newCode);
        validateCode(newCode);
    };

    const validateCode = (codeToValidate: string) => {
        // Check for required functions
        const hasInitialize = /def initialize\(.*\)/.test(codeToValidate);
        const hasOnTick = /def on_tick\(.*\)/.test(codeToValidate);
        const hasProposeOrders = /def propose_orders\(.*\)/.test(codeToValidate);
        const hasRiskCheck = /def risk_check\(.*\)/.test(codeToValidate);

        if (hasInitialize && hasOnTick && hasProposeOrders && hasRiskCheck) {
            setValidationStatus('valid');
        } else {
            setValidationStatus('invalid');
        }
    };

    const handleSave = async () => {
        if (!onSave) return;
        setSaving(true);
        try {
            await onSave(code);
        } finally {
            setSaving(false);
        }
    };

    const handleDryRun = async () => {
        if (!onDryRun) return;
        setRunning(true);
        setDryRunResult(null);
        try {
            const result = await onDryRun(code);
            setDryRunResult(result);
        } finally {
            setRunning(false);
        }
    };

    const handleReset = () => {
        setCode(initialCode);
        onChange?.(initialCode);
        validateCode(initialCode);
    };

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Strategy Editor</span>
                    <Badge variant={
                        validationStatus === 'valid' ? 'default' :
                            validationStatus === 'invalid' ? 'destructive' : 'secondary'
                    }>
                        {validationStatus === 'valid' && <Check className="h-3 w-3 mr-1" />}
                        {validationStatus === 'invalid' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {validationStatus === 'valid' ? 'Valid' : validationStatus === 'invalid' ? 'Missing Functions' : 'Unchecked'}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset} disabled={readOnly}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                    </Button>
                    {onDryRun && (
                        <Button variant="outline" size="sm" onClick={handleDryRun} disabled={running || validationStatus !== 'valid'}>
                            <Play className="h-4 w-4 mr-1" />
                            {running ? 'Running...' : 'Dry Run'}
                        </Button>
                    )}
                    {onSave && (
                        <Button size="sm" onClick={handleSave} disabled={saving || readOnly}>
                            <Save className="h-4 w-4 mr-1" />
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-[400px]">
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    value={code}
                    onChange={handleCodeChange}
                    onMount={handleEditorMount}
                    beforeMount={handleBeforeMount}
                    theme="vs-dark"
                    options={{
                        readOnly,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        tabSize: 4,
                        insertSpaces: true,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                    }}
                />
            </div>

            {/* Dry Run Results */}
            {dryRunResult && (
                <div className={`p-4 border-t ${dryRunResult.success ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        {dryRunResult.success ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">
                            {dryRunResult.success ? 'Dry Run Successful' : 'Dry Run Failed'}
                        </span>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
                        {dryRunResult.error || dryRunResult.logs}
                    </pre>
                </div>
            )}
        </div>
    );
}

export { DEFAULT_STRATEGY_CODE };
