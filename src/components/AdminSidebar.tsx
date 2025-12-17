import { BarChart3, Settings, LogOut, CreditCard, Shield, LucideIcon, User, Puzzle, Download, Package, Wallet, Landmark, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import furionPayLogoDark from "@/assets/furionpay-logo-white-text.png";
import furionPayLogoLight from "@/assets/furionpay-logo-dark-text.png";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { InstallAppDialog } from "@/components/InstallAppDialog";
const menuItems = [
  { title: "Admin", url: "/admin", icon: Shield, adminOnly: true },
  { title: "Dashboard", url: "/admin/dashboard", icon: BarChart3, adminOnly: false },
  { title: "Checkout", url: "/admin/checkout", icon: CreditCard, adminOnly: false },
  { title: "Produtos", url: "/admin/products", icon: Package, adminOnly: false },
  { title: "Integrações", url: "/admin/integrations", icon: Puzzle, adminOnly: false },
  { title: "Meta Pixels", url: "/admin/settings", icon: Settings, adminOnly: false },
  { title: "Painel Financeiro", url: "/admin/financeiro", icon: Wallet, adminOnly: false },
  { title: "Gestão Financeira", url: "/admin/gestao-financeira", icon: Landmark, adminOnly: false },
  { title: "Colaboradores", url: "/admin/colaboradores", icon: Users, adminOnly: false, ownerOnly: true },
];
interface AdminSidebarProps {
  userEmail?: string;
  userName?: string;
  onLogout: () => void;
  isAdmin?: boolean;
  isOwner?: boolean;
}
export function AdminSidebar({
  userEmail,
  userName,
  onLogout,
  isAdmin = false,
  isOwner = true
}: AdminSidebarProps) {
  const {
    theme
  } = useTheme();
  const {
    promptInstall,
    showInstallDialog,
    openInstallDialog,
    closeInstallDialog,
    isIOS
  } = usePWAInstall();
  const visibleMenuItems = menuItems.filter(item => {
    // Admin only items
    if (item.adminOnly && !isAdmin) return false;
    // Owner only items (like Colaboradores)
    if ((item as any).ownerOnly && !isOwner) return false;
    return true;
  });
  const logoSrc = theme === "dark" ? furionPayLogoDark : furionPayLogoLight;
  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border/50 bg-background dark:bg-black">
      {/* Header compacto */}
      <SidebarHeader className="p-4 flex flex-col items-center justify-center">
        <img src={logoSrc} alt="FurionPay" className="h-12 w-auto object-contain" />
      </SidebarHeader>

      <SidebarContent className="px-3 flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-3 px-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5 w-full">
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-muted/50 hover:scale-[1.02] group relative"
                      activeClassName="bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-medium shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-primary before:rounded-r-full"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                        <item.icon className="h-4 w-4" />
                      </div>
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:scale-[1.02] text-primary group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                      <Download className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">Instalar App</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Linha separadora antes do footer */}
      <div className="mx-3">
        <div className="h-px bg-border" />
      </div>

      {/* Footer moderno */}
      <SidebarFooter className="p-3 mt-auto">
        <div className="bg-gradient-to-r from-muted/40 to-transparent rounded-xl p-2">
          <NavLink 
            to="/admin/profile" 
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-all duration-200" 
            activeClassName="bg-primary/10"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-primary/20 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold truncate">{userName || "Usuário"}</span>
              <span className="text-xs text-muted-foreground/70 truncate">
                {userEmail || "Não identificado"}
              </span>
            </div>
          </NavLink>
          
          <div className="flex items-center justify-between mt-2 px-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout} 
              className="text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 px-2 h-8 text-xs"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sair
            </Button>
            <ThemeToggle />
          </div>
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