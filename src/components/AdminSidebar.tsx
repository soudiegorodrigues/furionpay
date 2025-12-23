import { BarChart3, Settings, LogOut, CreditCard, Shield, LucideIcon, User, Puzzle, Download, Package, Wallet, Landmark, Users, ShoppingCart } from "lucide-react";
import { NotificationToggle } from "@/components/NotificationToggle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import furionPayLogoDark from "@/assets/furionpay-logo-white-text.png";
import furionPayLogoLight from "@/assets/furionpay-logo-dark-text.png";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { Permissions } from "@/hooks/usePermissions";

type PermissionKey = keyof Omit<Permissions, 'id' | 'owner_id' | 'owner_email' | 'owner_name' | 'is_active' | 'is_collaborator'>;

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  permission?: PermissionKey;
}

const menuItems: MenuItem[] = [
  { title: "Admin", url: "/admin", icon: Shield, adminOnly: true },
  { title: "Dashboard", url: "/admin/dashboard", icon: BarChart3, permission: "can_view_dashboard" },
  { title: "Vendas", url: "/admin/vendas", icon: ShoppingCart, permission: "can_view_transactions" },
  { title: "Produtos", url: "/admin/products", icon: Package, permission: "can_manage_products" },
  { title: "Checkout API", url: "/admin/checkout", icon: CreditCard, permission: "can_manage_checkout" },
  { title: "Integrações", url: "/admin/integrations", icon: Puzzle, permission: "can_manage_integrations" },
  { title: "Meta Pixels", url: "/admin/settings", icon: Settings, permission: "can_manage_settings" },
  { title: "Painel Financeiro", url: "/admin/financeiro", icon: Wallet, permission: "can_view_financeiro" },
  { title: "Gestão Financeira", url: "/admin/gestao-financeira", icon: Landmark, permission: "can_manage_financeiro" },
  { title: "Equipe", url: "/admin/colaboradores", icon: Users, ownerOnly: true },
];

interface AdminSidebarProps {
  userEmail?: string;
  userName?: string;
  onLogout: () => void;
  isAdmin?: boolean;
  isOwner?: boolean;
  hasPermission?: (permission: PermissionKey) => boolean;
}

export function AdminSidebar({
  userEmail,
  userName,
  onLogout,
  isAdmin = false,
  isOwner = true,
  hasPermission
}: AdminSidebarProps) {
  const { theme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const {
    promptInstall,
    showInstallDialog,
    openInstallDialog,
    closeInstallDialog,
    isIOS
  } = usePWAInstall();

  // Obter userId do usuário logado
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  const visibleMenuItems = menuItems.filter(item => {
    // Admin only items
    if (item.adminOnly && !isAdmin) return false;
    // Owner only items (like Equipe)
    if (item.ownerOnly && !isOwner) return false;
    // Permission-based items - owners always have access
    if (item.permission && !isOwner && hasPermission && !hasPermission(item.permission)) return false;
    return true;
  });

  const logoSrc = theme === "dark" ? furionPayLogoDark : furionPayLogoLight;

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border/50 bg-sidebar">
      {/* Header compacto */}
      <SidebarHeader className="p-4 flex flex-col items-center justify-center">
        <img src={logoSrc} alt="FurionPay" className="h-16 w-auto object-contain" />
      </SidebarHeader>

      <SidebarContent className="px-3 flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 px-4">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 w-full">
              {visibleMenuItems.map((item, index) => (
                <SidebarMenuItem 
                  key={item.title} 
                  className="animate-fade-in" 
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                >
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 hover:bg-muted/30 group relative text-muted-foreground hover:text-foreground"
                      activeClassName="text-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-primary before:rounded-full"
                    >
                      <item.icon className="h-5 w-5 shrink-0 transition-colors" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Install App Button */}
              <SidebarMenuItem 
                className="animate-fade-in mt-4" 
                style={{ animationDelay: `${visibleMenuItems.length * 50}ms`, animationFillMode: 'both' }}
              >
                <SidebarMenuButton asChild>
                  <button 
                    onClick={openInstallDialog} 
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 w-full text-primary/70 hover:text-primary hover:bg-primary/5 group relative"
                  >
                    <Download className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">Instalar App</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer minimalista */}
      <SidebarFooter className="p-3 mt-auto border-t border-border/50">
        <NavLink 
          to="/admin/profile" 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-all duration-200 text-muted-foreground hover:text-foreground relative" 
          activeClassName="text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-primary before:rounded-full"
        >
          <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">{userName || "Usuário"}</span>
            <span className="text-xs text-muted-foreground truncate">
              {userEmail || "Não identificado"}
            </span>
          </div>
        </NavLink>
        
        <div className="flex items-center justify-center gap-2 mt-2 pt-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onLogout} 
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
          <NotificationToggle userId={userId} />
          <ThemeToggle />
        </div>
      </SidebarFooter>

      <InstallAppDialog open={showInstallDialog} onOpenChange={closeInstallDialog} isIOS={isIOS} onInstall={promptInstall} />
    </Sidebar>
  );
}

interface AdminHeaderProps {
  title?: string;
  icon?: LucideIcon;
}

export function AdminHeader({
  title,
  icon: Icon
}: AdminHeaderProps) {
  return <header className="h-14 border-b border-border bg-background flex items-center px-4 sticky top-0 z-10">
      {title}
    </header>;
}
