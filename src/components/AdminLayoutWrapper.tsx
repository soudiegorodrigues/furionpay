import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { supabase } from "@/integrations/supabase/client";
import { Menu, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import furionPayLogoLight from "@/assets/furionpay-logo-dark-text.png";
import furionPayLogoDark from "@/assets/furionpay-logo-white-text.png";

export function AdminLayoutWrapper() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, signOut, user, isBlocked, isAdmin, isApproved } = useAdminAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const { theme } = useTheme();
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

  // Show pending approval screen for non-approved users (except admins)
  if (!isApproved && !isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <CardTitle className="text-xl">Aguardando Aprovação</CardTitle>
            <CardDescription className="text-base">
              Sua conta foi criada com sucesso! No entanto, você precisa aguardar a aprovação de um administrador para acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Email: <span className="font-medium text-foreground">{user?.email}</span></p>
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
          {/* Mobile header with sidebar trigger */}
          <header className="md:hidden sticky top-0 z-20 h-14 border-b border-border bg-background flex items-center px-4">
            <SidebarTrigger className="mr-3">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <img 
              src={theme === "dark" ? furionPayLogoDark : furionPayLogoLight} 
              alt="FurionPay" 
              className="h-8 w-auto object-contain" 
            />
          </header>
          <BlockedUserAlert isBlocked={isBlocked} />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}