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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <Card className="max-w-md w-full relative z-10 border-border/50 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src={theme === "dark" ? furionPayLogoDark : furionPayLogoLight} 
                alt="FurionPay" 
                className="h-10 w-auto object-contain" 
              />
            </div>
            
            {/* Animated clock icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 animate-pulse" />
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-400/10 to-orange-500/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/25">
                  <Clock className="w-7 h-7 text-white animate-[spin_8s_linear_infinite]" />
                </div>
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Aguardando Aprovação
            </CardTitle>
            <CardDescription className="text-base mt-3 leading-relaxed">
              Sua conta foi criada com sucesso! Você receberá um email quando sua conta for aprovada por um administrador.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-2">
            {/* User info card */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-lg">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Conta registrada</p>
                  <p className="font-medium text-sm truncate">{user?.email}</p>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline" 
              className="w-full h-11 font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-200" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
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