import React, { memo, useMemo, useCallback } from "react";
import { BarChart3, Settings, LogOut, CreditCard, Shield, LucideIcon, User, Puzzle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import furionPayLogoDark from "@/assets/furionpay-logo-white-text.png";
import furionPayLogoLight from "@/assets/furionpay-logo-dark-text.png";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";

const menuItems = [{
  title: "Admin",
  url: "/admin",
  icon: Shield,
  adminOnly: true
}, {
  title: "Dashboard",
  url: "/admin/dashboard",
  icon: BarChart3,
  adminOnly: false
}, {
  title: "Checkout",
  url: "/admin/checkout",
  icon: CreditCard,
  adminOnly: false
}, {
  title: "Integrações",
  url: "/admin/integrations",
  icon: Puzzle,
  adminOnly: false
}, {
  title: "Meta Pixels",
  url: "/admin/settings",
  icon: Settings,
  adminOnly: false
}];

interface AdminSidebarProps {
  userEmail?: string;
  userName?: string;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const AdminSidebar = memo(function AdminSidebar({
  userEmail,
  userName,
  onLogout,
  isAdmin = false
}: AdminSidebarProps) {
  const { theme } = useTheme();
  
  // Memoize filtered menu items
  const visibleMenuItems = useMemo(() => 
    menuItems.filter(item => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  // Memoize logo based on theme
  const logoSrc = useMemo(() => 
    theme === "dark" ? furionPayLogoDark : furionPayLogoLight,
    [theme]
  );

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);
  
  return (
    <Sidebar collapsible="none" className="border-r border-border bg-background dark:bg-black w-64 min-w-64 max-w-64 flex-shrink-0">
      <SidebarHeader className="p-6 flex flex-col items-center justify-center">
        <img src={logoSrc} alt="FurionPay" className="h-16 w-auto object-contain" />
      </SidebarHeader>
      <SidebarContent className="px-3 flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 w-full">
              {visibleMenuItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-3 hover:bg-muted/50 rounded-lg px-3 py-2.5" 
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-4 mt-auto">
        <div className="border-t border-border pt-4">
          <NavLink 
            to="/admin/profile" 
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50" 
            activeClassName="bg-primary/10"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold truncate">{userName || "Usuário"}</span>
              <span className="text-xs text-muted-foreground truncate">
                {userEmail || "Não identificado"}
              </span>
            </div>
          </NavLink>
          
          <div className="flex items-center justify-center gap-4 mt-2 px-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout} 
              className="justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2">Sair</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
});

interface AdminHeaderProps {
  title?: string;
  icon?: LucideIcon;
}

export function AdminHeader({
  title,
  icon: Icon
}: AdminHeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 sticky top-0 z-10">
      {title && (
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <span className="font-semibold">{title}</span>
        </div>
      )}
    </header>
  );
}