import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  Key, 
  Zap, 
  Webhook, 
  Code, 
  AlertTriangle,
  Gauge,
  ChevronDown,
  ChevronRight,
  History
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isNew?: boolean;
  children?: { id: string; label: string; isNew?: boolean }[];
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
  { id: 'changelog', label: 'Changelog', icon: <History className="h-4 w-4" />, isNew: true },
];

interface ApiDocsSidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const ApiDocsSidebar = ({ activeSection, onNavigate }: ApiDocsSidebarProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['endpoints']));
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isChildActive = (item: NavItem) => {
    return item.children?.some(child => child.id === activeSection);
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
        <span className="absolute right-0 top-2 text-[10px] text-muted-foreground">
          {Math.round(scrollProgress)}%
        </span>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id || isChildActive(item);
          const isExpanded = expandedSections.has(item.id);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleSection(item.id);
                  }
                  onNavigate(item.id);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                  isActive ? 'bg-primary/20' : 'bg-muted'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.isNew && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    Novo
                  </span>
                )}
                {hasChildren && (
                  <span className="text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                )}
              </button>
              
              {/* Children */}
              {hasChildren && (
                <div className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                )}>
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-border pl-4 py-1">
                    {item.children!.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                        className={cn(
                          'w-full flex items-center gap-2 text-left px-3 py-2 rounded-md text-sm transition-all duration-200',
                          activeSection === child.id
                            ? 'text-primary font-medium bg-primary/5'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        <span className={cn(
                          'h-1.5 w-1.5 rounded-full transition-colors',
                          activeSection === child.id ? 'bg-primary' : 'bg-muted-foreground/50'
                        )} />
                        {child.label}
                        {child.isNew && (
                          <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                            Novo
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>API Version</span>
          <span className="font-mono font-medium text-foreground">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
