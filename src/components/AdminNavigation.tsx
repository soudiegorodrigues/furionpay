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
  Receipt
} from "lucide-react";

const adminSections = [
  { id: "faturamento", title: "Faturamento Global", icon: DollarSign },
  { id: "transacoes", title: "Transações Globais", icon: Receipt },
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Painel Admin</h1>
      <div className="flex flex-wrap gap-2">
        {adminSections.map((section) => (
          <Button
            key={section.id}
            variant={activeSection === section.id ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleSectionClick(section.id)}
          >
            <section.icon className="h-4 w-4" />
            {section.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
