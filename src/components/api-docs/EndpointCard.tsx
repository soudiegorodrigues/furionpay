import { useState } from 'react';
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MethodBadge } from './MethodBadge';

interface EndpointCardProps {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  title: string;
  description: string;
  children: React.ReactNode;
  isNew?: boolean;
}

export const EndpointCard = ({
  id,
  method,
  endpoint,
  title,
  description,
  children,
  isNew = false,
}: EndpointCardProps) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const fullUrl = `https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1${endpoint}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('URL copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleCopyAnchor = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/integration#${id}`);
      toast.success('Link copiado!');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <div id={id} className="scroll-mt-24 border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-3">
            <MethodBadge method={method} />
            {isNew && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Novo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <code className="text-sm sm:text-base font-mono font-medium truncate flex-1">
              {endpoint}
            </code>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopyUrl}
                title="Copiar URL"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopyAnchor}
                title="Copiar link desta seção"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 -mr-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <span className="hidden sm:inline mr-1">Recolher</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span className="hidden sm:inline mr-1">Expandir</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        'transition-all duration-300 ease-in-out overflow-hidden',
        expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="p-4 sm:p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};
