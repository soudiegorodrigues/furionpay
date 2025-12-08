import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar, AdminHeader } from "@/components/AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { RefreshCw } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  icon?: LucideIcon;
}

export function AdminLayout({ children, title, icon }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated, loading, signOut, user, isBlocked } = useAdminAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };

  // Redirect if not authenticated
  if (!loading && !isAuthenticated) {
    navigate('/admin');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar userEmail={user?.email} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader title={title} icon={icon} />
          <BlockedUserAlert isBlocked={isBlocked} />
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
