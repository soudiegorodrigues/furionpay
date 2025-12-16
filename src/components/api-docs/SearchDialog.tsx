import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Zap, Key, Webhook, Code, AlertTriangle, Gauge, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const searchableItems: SearchResult[] = [
  { id: 'introduction', title: 'Introdução', description: 'Visão geral da API FurionPay', icon: <FileText className="h-4 w-4" />, category: 'Documentação' },
  { id: 'authentication', title: 'Autenticação', description: 'Como autenticar suas requisições', icon: <Key className="h-4 w-4" />, category: 'Segurança' },
  { id: 'create-pix', title: 'Criar PIX', description: 'POST /api-v1-pix-create', icon: <Zap className="h-4 w-4" />, category: 'Endpoints' },
  { id: 'check-status', title: 'Consultar Status', description: 'GET /api-v1-pix-status', icon: <Zap className="h-4 w-4" />, category: 'Endpoints' },
  { id: 'webhooks', title: 'Webhooks', description: 'Receba notificações em tempo real', icon: <Webhook className="h-4 w-4" />, category: 'Integrações' },
  { id: 'code-examples', title: 'Exemplos de Código', description: 'Exemplos em várias linguagens', icon: <Code className="h-4 w-4" />, category: 'Referência' },
  { id: 'errors', title: 'Códigos de Erro', description: 'Lista de erros da API', icon: <AlertTriangle className="h-4 w-4" />, category: 'Referência' },
  { id: 'rate-limits', title: 'Rate Limits', description: 'Limites de requisições', icon: <Gauge className="h-4 w-4" />, category: 'Referência' },
];

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (sectionId: string) => void;
}

export const SearchDialog = ({ open, onOpenChange, onNavigate }: SearchDialogProps) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredResults = searchableItems.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback((id: string) => {
    onNavigate(id);
    onOpenChange(false);
    setQuery('');
    setSelectedIndex(0);
  }, [onNavigate, onOpenChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredResults[selectedIndex]) {
            handleSelect(filteredResults[selectedIndex].id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredResults, handleSelect]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar na documentação..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 h-14 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum resultado encontrado para "{query}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0',
                    index === selectedIndex ? 'bg-primary/20' : 'bg-muted'
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.title}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ArrowRight className={cn(
                    'h-4 w-4 flex-shrink-0 transition-opacity',
                    index === selectedIndex ? 'opacity-100' : 'opacity-0'
                  )} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="h-5 w-5 inline-flex items-center justify-center rounded border border-border bg-background">↑</kbd>
              <kbd className="h-5 w-5 inline-flex items-center justify-center rounded border border-border bg-background">↓</kbd>
              <span className="ml-1">navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="h-5 px-1.5 inline-flex items-center justify-center rounded border border-border bg-background">↵</kbd>
              <span className="ml-1">selecionar</span>
            </span>
          </div>
          <span>Powered by FurionPay</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
