import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  CreditCard, 
  Tag, 
  Globe,
  ShoppingCart,
  Target,
  Handshake,
  Store,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Section = 
  | "details" 
  | "checkout" 
  | "offers" 
  | "domains" 
  | "order-bump" 
  | "pixels" 
  | "coproduction" 
  | "affiliation" 
  | "danger-zone";

export const navigationItems: { id: Section; label: string; description: string; icon: React.ElementType }[] = [
  { id: "details", label: "Detalhes do produto", description: "Informações gerais sobre o produto", icon: FileText },
  { id: "checkout", label: "Checkout", description: "Configurações de pagamento e personalização", icon: CreditCard },
  { id: "order-bump", label: "Order Bump", description: "Configurar ofertas adicionais", icon: ShoppingCart },
  { id: "offers", label: "Ofertas", description: "Gerenciar links e ofertas", icon: Tag },
  { id: "domains", label: "Domínios", description: "Adicione o seu próprio domínio no checkout", icon: Globe },
  { id: "pixels", label: "Pixels", description: "Configurar pixels de rastreamento", icon: Target },
  { id: "coproduction", label: "Co produção", description: "Adicione coprodutores ao seu produto", icon: Handshake },
  { id: "affiliation", label: "Afiliação e marketplace", description: "Configurações de afiliação e marketplace", icon: Store },
  { id: "danger-zone", label: "Danger Zone", description: "Ações irreversíveis", icon: AlertTriangle },
];

interface ProductNavigationProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}

export function ProductNavigation({ activeSection, setActiveSection }: ProductNavigationProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Navegação</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                activeSection === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mt-0.5 shrink-0",
                activeSection === item.id ? "text-primary-foreground" : "text-muted-foreground"
              )} />
              <div>
                <p className="font-medium text-sm">{item.label}</p>
                <p className={cn(
                  "text-xs",
                  activeSection === item.id ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
