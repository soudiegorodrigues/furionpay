import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { Button } from "@/components/ui/button";
import { RefreshCw, DollarSign, Trophy, Globe, CreditCard, Users, FileText, Percent, Palette, Mail, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const adminSections = [
  { id: "faturamento", title: "Faturamento Global", icon: DollarSign, path: "/admin", section: "faturamento" },
  { id: "ranking", title: "Ranking de Faturamentos", icon: Trophy, path: "/admin", section: "ranking" },
  { id: "dominios", title: "Domínios", icon: Globe, path: "/admin", section: "dominios" },
  { id: "multi", title: "Multi-adquirência", icon: CreditCard, path: "/admin", section: "multi" },
  { id: "usuarios", title: "Usuários", icon: Users, path: "/admin", section: "usuarios" },
  { id: "documentos", title: "Documentos", icon: FileText, path: "/admin", section: "documentos" },
  { id: "taxas", title: "Taxas", icon: Percent, path: "/admin", section: "taxas" },
  { id: "personalizacao", title: "Personalização", icon: Palette, path: "/admin/personalization", section: null },
  { id: "email", title: "Email", icon: Mail, path: "/admin/email", section: null },
  { id: "zona-perigo", title: "Zona de Perigo", icon: AlertTriangle, path: "/admin", section: "zona-perigo" },
];

interface AdminLayoutProps {
  children: ReactNode;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function AdminLayout({ children, activeSection, onSectionChange }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, signOut, user, isBlocked, isAdmin } = useAdminAuth();
  const [userName, setUserName] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
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
    navigate('/admin');
  };

  const handleSectionClick = (section: typeof adminSections[0]) => {
    if (section.section && onSectionChange) {
      if (location.pathname === '/admin') {
        onSectionChange(section.section);
      } else {
        navigate(section.path, { state: { section: section.section } });
      }
    } else {
      navigate(section.path);
    }
  };

  const isActiveSection = (section: typeof adminSections[0]) => {
    if (section.path === '/admin/personalization') {
      return location.pathname === '/admin/personalization';
    }
    if (section.path === '/admin/email') {
      return location.pathname === '/admin/email';
    }
    return location.pathname === '/admin' && activeSection === section.section;
  };

  // Don't show loading spinner - render content immediately
  // Authentication redirect is handled by useEffect above

  // Don't render anything while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Only show admin panel navigation on specific routes
  const showAdminNavigation = ['/admin', '/admin/personalization', '/admin/email'].includes(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar userEmail={user?.email} userName={userName || undefined} onLogout={handleLogout} isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col min-w-0">
          <BlockedUserAlert isBlocked={isBlocked} />
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {showAdminNavigation ? (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">Painel Admin</h1>
                
                {/* Navigation Buttons */}
                <div className="flex flex-wrap gap-3">
                  {adminSections.map((section) => (
                    <Button
                      key={section.id}
                      variant={isActiveSection(section) ? "default" : "outline"}
                      className="flex items-center gap-2"
                      onClick={() => handleSectionClick(section)}
                    >
                      <section.icon className="h-4 w-4" />
                      {section.title}
                    </Button>
                  ))}
                </div>

                {children}
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
