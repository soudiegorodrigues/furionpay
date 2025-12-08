import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { Button } from "@/components/ui/button";
import { RefreshCw, DollarSign, Trophy, Globe, CreditCard, Users, FileText, Percent, Palette, Mail, AlertTriangle } from "lucide-react";

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

  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };

  const handleSectionClick = (section: typeof adminSections[0]) => {
    if (section.section && onSectionChange) {
      // If we're already on /admin, just change section
      if (location.pathname === '/admin') {
        onSectionChange(section.section);
      } else {
        // Navigate to /admin with section state
        navigate(section.path, { state: { section: section.section } });
      }
    } else {
      // Direct navigation for personalization/email
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

  // Redirect if not authenticated or not admin
  if (!loading && (!isAuthenticated || !isAdmin)) {
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

  // Only show admin panel navigation on specific routes
  const showAdminNavigation = ['/admin', '/admin/personalization', '/admin/email'].includes(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar userEmail={user?.email} onLogout={handleLogout} />
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
