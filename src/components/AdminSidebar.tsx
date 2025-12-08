import { BarChart3, Settings, LogOut, CreditCard, Shield, LucideIcon, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import furionPayLogo from "@/assets/furionpay-logo.png";
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
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Dashboard", url: "/admin/dashboard", icon: BarChart3 },
  { title: "Checkout", url: "/admin/checkout", icon: CreditCard },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  userEmail?: string;
  onLogout: () => void;
}

export function AdminSidebar({ userEmail, onLogout }: AdminSidebarProps) {
  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex flex-col gap-2">
          <img 
            src={furionPayLogo} 
            alt="FurionPay" 
            className="h-10 w-auto object-contain"
          />
          <span className="text-xs text-muted-foreground truncate">
            {userEmail || "Painel"}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-2 hover:bg-muted/50 rounded-md px-2 py-1.5" 
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="text-xs text-muted-foreground">Tema</span>
        </div>
        
        <div className="border-t border-border pt-3">
          <NavLink 
            to="/admin/profile" 
            className="flex items-center gap-3 mb-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
            activeClassName="bg-primary/10"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">Meu Perfil</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {userEmail || "Não identificado"}
              </span>
            </div>
          </NavLink>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onLogout}
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2">Sair da conta</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface AdminHeaderProps {
  title?: string;
  icon?: LucideIcon;
}

export function AdminHeader({ title, icon: Icon }: AdminHeaderProps) {
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
