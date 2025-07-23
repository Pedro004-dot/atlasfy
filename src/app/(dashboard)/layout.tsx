import { Sidebar } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ConditionalProfileBanner } from '@/components/layout/ProfileCompletionBanner';
import { EmpresaProvider } from '@/contexts/EmpresaContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <EmpresaProvider>
        <div className="h-screen flex flex-col overflow-hidden bg-background">
          <ConditionalProfileBanner />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="p-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </EmpresaProvider>
    </AuthGuard>
  );
}