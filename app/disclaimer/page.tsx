import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DisclaimerPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4">
            <Card className="max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    </div>
                    <CardTitle className="text-2xl">Risk Disclaimer</CardTitle>
                    <CardDescription>
                        Please read and understand before trading
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="prose prose-sm dark:prose-invert">
                        <h3 className="font-semibold">Trading Risks</h3>
                        <p className="text-muted-foreground">
                            Trading on prediction markets involves substantial risk of loss and is not suitable
                            for all investors. You should carefully consider whether trading is appropriate for
                            you in light of your experience, objectives, financial resources and other circumstances.
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <h3 className="font-semibold">By using this platform, you acknowledge:</h3>
                        <ul className="space-y-2">
                            {[
                                'You may lose all funds you trade with',
                                'Past performance does not guarantee future results',
                                'Automated strategies may malfunction or produce unexpected results',
                                'You are solely responsible for your trading decisions',
                                'This platform does not provide investment advice',
                                'You have read and understand the Polymarket terms of service',
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <Separator />

                    <div className="bg-yellow-500/10 border-yellow-500/20 border rounded-lg p-4">
                        <p className="text-sm text-yellow-600 dark:text-yellow-500">
                            <strong>Paper Trading Mode:</strong> We strongly recommend starting with paper trading
                            to understand how the platform works before using real funds. Paper trading uses
                            simulated funds and carries no financial risk.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Link href="/login">
                            <Button className="w-full">
                                I Understand the Risks - Continue
                            </Button>
                        </Link>
                        <a
                            href="https://polymarket.com/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                            View Polymarket Terms <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
