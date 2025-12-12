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
  AlertTriangle,
  Receipt,
  PieChart,
  Wallet
} from "lucide-react";

const adminSections = [
  { id: "faturamento", title: "Faturamento Global", icon: DollarSign },
  { id: "transacoes", title: "Transações Globais", icon: Receipt },
  { id: "checkout-global", title: "Checkout Global", icon: PieChart },
  { id: "saques", title: "Saque Global", icon: Wallet },
  { id: "ranking", title: "Ranking", icon: Trophy },
  { id: "dominios", title: "Domínios", icon: Globe },
  { id: "multi", title: "Multi-adquirência", icon: CreditCard },
  { id: "usuarios", title: "Usuários", icon: Users },
  { id: "taxas", title: "Taxas", icon: Percent },
  { id: "personalizacao", title: "Personalização", icon: Palette },
  { id: "email", title: "Email", icon: Mail },
  { id: "zona-perigo", title: "Zona de Perigo", icon: AlertTriangle },
];

interface AdminNavigationProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function AdminNavigation({ activeSection, onSectionChange }: AdminNavigationProps) {
  const handleSectionClick = (sectionId: string) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Painel Admin</h1>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {adminSections.map((section) => (
          <Button
            key={section.id}
            variant={activeSection === section.id ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            onClick={() => handleSectionClick(section.id)}
          >
            <section.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">{section.title}</span>
            <span className="xs:hidden sm:hidden">{section.title.split(' ')[0]}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
