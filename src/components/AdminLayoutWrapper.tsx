import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { BillingProgressBadge } from "@/components/BillingProgressBadge";
import { supabase } from "@/integrations/supabase/client";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactionNotifications } from "@/hooks/useTransactionNotifications";
import { ChatWidgetLoader } from "@/components/ChatWidgetLoader";
import { prefetchCheckoutData } from "@/hooks/useCheckoutData";
import furionPayLogoLight from "@/assets/furionpay-logo-dark-text.png";
import furionPayLogoDark from "@/assets/furionpay-logo-white-text.png";

// Cache key for session state
const SESSION_CACHE_KEY = 'admin_session_cache';
const AUTH_CACHE_KEY = 'furionpay_auth_cache';

// Get cached session state for instant initial render
const getCachedSessionState = () => {
  try {
    const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Cache expires after 30 minutes for instant reload
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        return parsed;
      }
    }
  } catch {}
  return null;
};

// Check if we have a cached auth state (for skeleton bypass)
const hasCachedAuth = () => {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return Date.now() - parsed.timestamp < 30 * 60 * 1000;
    }
  } catch {}
  return false;
};

export function AdminLayoutWrapper() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading, signOut, user, isBlocked, isAdmin, isApproved, mfaInfo, checkMFAStatus } = useAdminAuth();
  const { isOwner, hasPermission } = usePermissions();
  const [userName, setUserName] = useState<string | null>(() => getCachedSessionState()?.userName || null);
  const [mfaChecked, setMfaChecked] = useState(false);
  const { theme } = useTheme();
  const initialAuthChecked = useRef(false);
  const prefetchedRef = useRef(false);
  
  // Cache session state for faster reloads
  useEffect(() => {
    if (isAuthenticated && user?.id && !loading) {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        userName,
        isApproved,
        isAdmin,
        timestamp: Date.now()
      }));
    }
  }, [isAuthenticated, user?.id, userName, isApproved, isAdmin, loading]);

  // Transaction notifications - only active for authenticated users inside admin
  useTransactionNotifications(user?.id || null);

  // Prefetch checkout data in background for instant loading
  useEffect(() => {
    if (user?.id && isApproved && !prefetchedRef.current) {
      prefetchedRef.current = true;
      prefetchCheckoutData(queryClient, user.id);
    }
  }, [user?.id, isApproved, queryClient]);

  // Check MFA status and redirect if not configured
  useEffect(() => {
    const checkMFA = async () => {
      console.log('[AdminLayout] Checking MFA - loading:', loading, 'isAuthenticated:', isAuthenticated, 'isApproved:', isApproved, 'mfaChecked:', mfaChecked);
      
      if (!loading && isAuthenticated && isApproved && !mfaChecked) {
        const info = await checkMFAStatus();
        console.log('[AdminLayout] MFA Info:', info);
        setMfaChecked(true);
        
        // Só redireciona para configurar 2FA se:
        // 1. Não tem fator TOTP configurado
        // 2. E não está em aal2 (já verificou o 2FA nesta sessão)
        if (info && !info.hasTOTPFactor && info.currentLevel !== 'aal2') {
          console.log('[AdminLayout] Redirecting to 2FA setup');
          navigate('/autenticador', { replace: true });
        }
      }
    };
    checkMFA();
  }, [loading, isAuthenticated, isApproved, mfaChecked, checkMFAStatus, navigate]);

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

  // Show skeleton only if loading AND no cached auth (instant render with cache)
  if (loading && !hasCachedAuth()) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        <div className="w-64 min-w-64 max-w-64 flex-shrink-0 border-r border-border bg-background dark:bg-black" />
        <div className="flex-1" />
      </div>
    );
  }

  // If loading but has cache, show full layout immediately
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
            <div className="flex justify-center mb-8">
              <img 
                src={theme === "dark" ? furionPayLogoDark : furionPayLogoLight} 
                alt="FurionPay" 
                className="h-16 w-auto object-contain" 
              />
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
      <div className="h-[100dvh] flex w-full bg-background overflow-hidden">
        <AdminSidebar 
          userEmail={user?.email} 
          userName={userName || undefined} 
          onLogout={handleLogout} 
          isAdmin={isAdmin}
          isOwner={isOwner}
          hasPermission={hasPermission}
        />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Desktop header with billing progress */}
          <header className="hidden md:flex sticky top-0 z-20 h-14 border-b border-border bg-background items-center justify-end px-6">
            <BillingProgressBadge userId={user?.id} />
          </header>
          {/* Mobile header with sidebar trigger */}
          <header className="md:hidden sticky top-0 z-20 h-14 border-b border-border bg-background flex items-center justify-center px-4 relative">
            <SidebarTrigger className="absolute left-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <img 
              src={theme === "dark" ? furionPayLogoDark : furionPayLogoLight} 
              alt="FurionPay" 
              className="h-10 w-auto object-contain" 
            />
          </header>
          <BlockedUserAlert isBlocked={isBlocked} />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
        
        {/* Chat Widget for sellers */}
        {user?.id && <ChatWidgetLoader userId={user.id} />}
      </div>
    </SidebarProvider>
  );
}
