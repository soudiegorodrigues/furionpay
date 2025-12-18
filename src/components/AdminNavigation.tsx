import { Button } from "@/components/ui/button";
import { DollarSign, Trophy, Globe, CreditCard, Users, Percent, Palette, Mail, AlertTriangle, PieChart, Wallet, FileCheck, Bug, Award, Activity, TrendingUp, Bell, Database, Shield, LayoutTemplate } from "lucide-react";

const adminSections = {
  analises: {
    label: "Análise de Dados",
    items: [
      { id: "usuarios", title: "Usuários", icon: Users },
      { id: "documentos", title: "Documentos", icon: FileCheck },
      { id: "taxas", title: "Taxas", icon: Percent },
      { id: "premiacoes", title: "Premiações", icon: Award },
      { id: "ranking", title: "Ranking", icon: Trophy },
    ]
  },
  financeiros: {
    label: "Financeiros",
    items: [
      { id: "saques", title: "Saque Global", icon: Wallet },
      { id: "faturamento", title: "Faturamento Global", icon: DollarSign },
      { id: "receita-plataforma", title: "Revenue (MRR)", icon: TrendingUp },
    ]
  },
  gerenciamento: {
    label: "Gerenciamento",
    items: [
      { id: "checkout-global", title: "Checkout Global", icon: PieChart },
      { id: "dominios", title: "Domínios", icon: Globe },
      { id: "multi", title: "Multi-adquirência", icon: CreditCard },
      { id: "api-monitoring", title: "API Status", icon: Activity },
      { id: "templates", title: "Templates", icon: LayoutTemplate },
    ]
  },
  configuracoes: {
    label: "Configurações",
    items: [
      { id: "anti-fraude", title: "Anti-Fraude", icon: Shield },
      { id: "notificacoes", title: "Notificações", icon: Bell },
      { id: "personalizacao", title: "Personalização", icon: Palette },
      { id: "email", title: "Email", icon: Mail },
      { id: "backups", title: "Backups", icon: Database },
      { id: "utm-debug", title: "UTM Debug", icon: Bug },
      { id: "zona-perigo", title: "Zona de Perigo", icon: AlertTriangle },
    ]
  }
};

interface AdminNavigationProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function AdminNavigation({
  activeSection,
  onSectionChange
}: AdminNavigationProps) {
  const handleSectionClick = (sectionId: string) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Painel Administrativo</h1>
      
      {Object.entries(adminSections).map(([key, section]) => (
        <div key={key} className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {section.label}
          </h3>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {section.items.map(item => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                onClick={() => handleSectionClick(item.id)}
              >
                <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">{item.title}</span>
                <span className="xs:hidden sm:hidden">{item.title.split(' ')[0]}</span>
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}