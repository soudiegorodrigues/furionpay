import { ReactNode, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  children: ReactNode;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function AdminLayout({ children, activeSection, onSectionChange }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated, loading, signOut, user, isBlocked, isAdmin } = useAdminAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading) {
      setHasCheckedAuth(true);
      if (!isAuthenticated) {
        navigate('/login');
      }
    }
  }, [loading, isAuthenticated, navigate]);

  // Fetch user profile name - only once when user is available
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (data?.full_name) {
        setUserName(data.full_name);
      }
    };
    
    fetchProfile();
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Memoize sidebar props to prevent unnecessary re-renders
  const sidebarProps = useMemo(() => ({
    userEmail: user?.email,
    userName: userName || undefined,
    onLogout: handleLogout,
    isAdmin
  }), [user?.email, userName, isAdmin]);

  // Show nothing only during initial auth check, not on route changes
  if (!hasCheckedAuth && loading) {
    return null;
  }

  if (!isAuthenticated && hasCheckedAuth) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar {...sidebarProps} />
        <div className="flex-1 flex flex-col min-w-0">
          <BlockedUserAlert isBlocked={isBlocked} />
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
