import { Sidebar } from '@/components/dashboard/sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <main className="pl-64">
                {children}
            </main>
            <Toaster />
        </div>
    );
}
