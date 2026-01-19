import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function DebugPage() {
    const session = await auth();
    const headersList = headers();
    const envCheck = {
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
    };

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Debug Session</h1>

            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Session Data</h2>
                <pre className="bg-slate-950 p-4 rounded border overflow-auto">
                    {JSON.stringify(session, null, 2)}
                </pre>
            </div>

            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Environment Check</h2>
                <pre className="bg-slate-950 p-4 rounded border overflow-auto">
                    {JSON.stringify(envCheck, null, 2)}
                </pre>
            </div>

            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Cookies Present</h2>
                <pre className="bg-slate-950 p-4 rounded border overflow-auto">
                    {/* Listing cookie names only for security */}
                    {headersList.get('cookie')?.split(';').map(c => c.split('=')[0].trim()).join('\n')}
                </pre>
            </div>
        </div>
    );
}
