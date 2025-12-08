import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Trophy, 
  Globe, 
  CreditCard, 
  Users, 
  Percent, 
  Palette, 
  Mail, 
  AlertTriangle 
} from "lucide-react";

const adminSections = [
  { id: "faturamento", title: "Faturamento Global", icon: DollarSign, path: "/admin", section: "faturamento" },
  { id: "ranking", title: "Ranking", icon: Trophy, path: "/admin", section: "ranking" },
  { id: "dominios", title: "Domínios", icon: Globe, path: "/admin", section: "dominios" },
  { id: "multi", title: "Multi-adquirência", icon: CreditCard, path: "/admin", section: "multi" },
  { id: "usuarios", title: "Usuários", icon: Users, path: "/admin", section: "usuarios" },
  { id: "taxas", title: "Taxas", icon: Percent, path: "/admin", section: "taxas" },
  { id: "personalizacao", title: "Personalização", icon: Palette, path: "/admin/personalization", section: null },
  { id: "email", title: "Email", icon: Mail, path: "/admin/email", section: null },
  { id: "zona-perigo", title: "Zona de Perigo", icon: AlertTriangle, path: "/admin", section: "zona-perigo" },
];

interface AdminNavigationProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function AdminNavigation({ activeSection, onSectionChange }: AdminNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionClick = (section: typeof adminSections[0]) => {
    if (section.path === '/admin/personalization') {
      navigate('/admin/personalization');
    } else if (section.path === '/admin/email') {
      navigate('/admin/email');
    } else if (section.section && onSectionChange) {
      if (location.pathname === '/admin') {
        onSectionChange(section.section);
      } else {
        navigate('/admin', { state: { section: section.section } });
      }
    } else if (section.section) {
      navigate('/admin', { state: { section: section.section } });
    }
  };

  const isActive = (section: typeof adminSections[0]) => {
    if (section.path === '/admin/personalization') {
      return location.pathname === '/admin/personalization';
    }
    if (section.path === '/admin/email') {
      return location.pathname === '/admin/email';
    }
    return location.pathname === '/admin' && activeSection === section.section;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Painel Admin</h1>
      <div className="flex flex-wrap gap-2">
        {adminSections.map((section) => (
          <Button
            key={section.id}
            variant={isActive(section) ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleSectionClick(section)}
          >
            <section.icon className="h-4 w-4" />
            {section.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
