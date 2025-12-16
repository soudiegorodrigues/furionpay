import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  Key, 
  Zap, 
  Webhook, 
  Code, 
  AlertTriangle,
  Gauge,
  ChevronRight
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: { id: string; label: string }[];
}

const navItems: NavItem[] = [
  { id: 'introduction', label: 'Introdução', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'authentication', label: 'Autenticação', icon: <Key className="h-4 w-4" /> },
  { 
    id: 'endpoints', 
    label: 'Endpoints', 
    icon: <Zap className="h-4 w-4" />,
    children: [
      { id: 'create-pix', label: 'Criar PIX' },
      { id: 'check-status', label: 'Consultar Status' },
    ]
  },
  { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="h-4 w-4" /> },
  { id: 'code-examples', label: 'Exemplos de Código', icon: <Code className="h-4 w-4" /> },
  { id: 'errors', label: 'Códigos de Erro', icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'rate-limits', label: 'Rate Limits', icon: <Gauge className="h-4 w-4" /> },
];

interface ApiDocsSidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const ApiDocsSidebar = ({ activeSection, onNavigate }: ApiDocsSidebarProps) => {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => (
        <div key={item.id}>
          <button
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeSection === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {item.icon}
            {item.label}
            {item.children && <ChevronRight className="h-3 w-3 ml-auto" />}
          </button>
          {item.children && (
            <div className="ml-6 mt-1 space-y-1 border-l border-border pl-3">
              {item.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => onNavigate(child.id)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded text-sm transition-colors',
                    activeSection === child.id
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {child.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};
