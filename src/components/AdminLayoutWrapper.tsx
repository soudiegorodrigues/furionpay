import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { supabase } from "@/integrations/supabase/client";

export function AdminLayoutWrapper() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, signOut, user, isBlocked, isAdmin } = useAdminAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const initialAuthChecked = useRef(false);

  // Redirect if not authenticated - only on initial load
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && !initialAuthChecked.current) {
        navigate('/login');
      }
      initialAuthChecked.current = true;
    }
  }, [loading, isAuthenticated, navigate]);

  // Fetch user profile name
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

  // Only show skeleton during very first auth check
  if (loading && !initialAuthChecked.current) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        <div className="w-64 min-w-64 max-w-64 flex-shrink-0 border-r border-border bg-background dark:bg-black" />
        <div className="flex-1" />
      </div>
    );
  }

  if (!isAuthenticated && !loading) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          userEmail={user?.email} 
          userName={userName || undefined} 
          onLogout={handleLogout} 
          isAdmin={isAdmin} 
        />
        <div className="flex-1 flex flex-col min-w-0">
          <BlockedUserAlert isBlocked={isBlocked} />
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}