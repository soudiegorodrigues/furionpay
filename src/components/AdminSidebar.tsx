import { BarChart3, Settings, LogOut, CreditCard, Shield, LucideIcon, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import furionPayLogo from "@/assets/furionpay-logo-full.png";
import furionPayLogoLight from "@/assets/furionpay-logo-light.png";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
const menuItems = [{
  title: "Admin",
  url: "/admin",
  icon: Shield
}, {
  title: "Dashboard",
  url: "/admin/dashboard",
  icon: BarChart3
}, {
  title: "Checkout",
  url: "/admin/checkout",
  icon: CreditCard
}, {
  title: "Configurações",
  url: "/admin/settings",
  icon: Settings
}];
interface AdminSidebarProps {
  userEmail?: string;
  onLogout: () => void;
}
export function AdminSidebar({
  userEmail,
  onLogout
}: AdminSidebarProps) {
  const { theme } = useTheme();
  
  return <Sidebar className="border-r border-border">
      <SidebarHeader className="p-6 flex items-center justify-center">
        <img src={theme === "dark" ? furionPayLogo : furionPayLogoLight} alt="FurionPay" className="h-16 w-auto object-contain" />
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="flex items-center gap-3 hover:bg-muted/50 rounded-lg px-3 py-2.5 transition-colors" activeClassName="bg-primary/10 text-primary font-medium">
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-4 mt-auto">
        <div className="flex items-center gap-3 px-2">
          <ThemeToggle />
          <span className="text-sm text-muted-foreground">Tema</span>
        </div>
        
        <div className="border-t border-border pt-4">
          <NavLink to="/admin/profile" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors" activeClassName="bg-primary/10">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold truncate">FURIONPAY</span>
              <span className="text-xs text-muted-foreground truncate">
                {userEmail || "Não identificado"}
              </span>
            </div>
          </NavLink>
          
          <Button variant="ghost" size="sm" onClick={onLogout} className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-2 px-3">
            <LogOut className="h-4 w-4" />
            <span className="ml-2">Sair da conta</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>;
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
      {title && <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <span className="font-semibold">{title}</span>
        </div>}
    </header>;
}