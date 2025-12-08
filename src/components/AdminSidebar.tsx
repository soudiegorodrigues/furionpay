import { BarChart3, Settings, Users, Globe, LogOut, QrCode, Menu, CreditCard, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Dashboard", url: "/admin/dashboard", icon: BarChart3 },
  { title: "Checkout", url: "/admin/checkout", icon: CreditCard },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Domínios", url: "/admin/domains", icon: Globe },
];

interface AdminSidebarProps {
  userEmail?: string;
  onLogout: () => void;
}

export function AdminSidebar({ userEmail, onLogout }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <QrCode className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">PIX Admin</span>
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                {userEmail || "Painel"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-2 hover:bg-muted/50 rounded-md px-2 py-1.5" 
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!collapsed && <span className="text-xs text-muted-foreground">Tema</span>}
        </div>
        <Button 
          variant="outline" 
          size={collapsed ? "icon" : "sm"} 
          onClick={onLogout}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

interface AdminHeaderProps {
  title?: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 sticky top-0 z-10">
      <SidebarTrigger className="mr-4">
        <Menu className="h-5 w-5" />
      </SidebarTrigger>
      {title && (
        <span className="font-semibold">{title}</span>
      )}
    </header>
  );
}
