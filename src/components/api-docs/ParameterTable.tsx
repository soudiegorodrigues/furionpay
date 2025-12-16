import { cn } from '@/lib/utils';
import { ChevronRight, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  children?: Parameter[];
}

interface ParameterTableProps {
  parameters: Parameter[];
  title?: string;
}

const typeColors: Record<string, string> = {
  string: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  number: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  boolean: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  object: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  array: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
};

const getTypeColor = (type: string): string => {
  const lowerType = type.toLowerCase();
  for (const [key, value] of Object.entries(typeColors)) {
    if (lowerType.includes(key)) return value;
  }
  return 'bg-muted text-muted-foreground border-border';
};

const ParameterRow = ({ param, depth = 0 }: { param: Parameter; depth?: number }) => {
  const isNested = depth > 0;
  
  return (
    <>
      {/* Desktop Row */}
      <tr className={cn(
        'hidden sm:table-row border-b border-border last:border-0',
        isNested && 'bg-muted/30'
      )}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 16}px` }}>
            {isNested && (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
            <code className="text-sm font-mono font-medium">{param.name}</code>
            {param.required && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                Obrigatório
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded text-xs font-medium border',
            getTypeColor(param.type)
          )}>
            {param.type}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {param.description}
        </td>
      </tr>
      
      {/* Mobile Card */}
      <div className={cn(
        'sm:hidden p-4 border-b border-border last:border-0',
        isNested && 'bg-muted/30 ml-4 border-l-2 border-l-primary/20'
      )}>
        <div className="flex items-center gap-2 mb-2">
          {isNested && (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <code className="text-sm font-mono font-medium">{param.name}</code>
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded text-xs font-medium border',
            getTypeColor(param.type)
          )}>
            {param.type}
          </span>
        </div>
        <div className="flex items-start gap-2">
          {param.required && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
              Obrigatório
            </span>
          )}
          <p className="text-sm text-muted-foreground">{param.description}</p>
        </div>
      </div>
      
      {/* Render children recursively */}
      {param.children?.map((child) => (
        <ParameterRow key={child.name} param={child} depth={depth + 1} />
      ))}
    </>
  );
};

export const ParameterTable = ({ parameters, title = 'Parâmetros' }: ParameterTableProps) => {
  return (
    <div className="my-4">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Campos marcados como "Obrigatório" devem ser enviados</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Desktop Table */}
        <table className="hidden sm:table w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold w-1/4">Nome</th>
              <th className="text-left px-4 py-3 font-semibold w-24">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param) => (
              <ParameterRow key={param.name} param={param} />
            ))}
          </tbody>
        </table>
        
        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-border">
          {parameters.map((param) => (
            <ParameterRow key={param.name} param={param} />
          ))}
        </div>
      </div>
    </div>
  );
};
