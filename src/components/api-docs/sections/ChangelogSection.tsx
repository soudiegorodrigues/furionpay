import { GitCommit, AlertTriangle, Zap, Bug, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix' | 'breaking';
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '1.0.1',
    date: '2024-12-15',
    changes: [
      { type: 'improvement', description: 'Documentação expandida com mais exemplos de código' },
      { type: 'improvement', description: 'Melhoria no tempo de resposta dos endpoints' },
      { type: 'fix', description: 'Correção no cálculo de expiração do PIX (30 minutos)' },
      { type: 'fix', description: 'Correção em edge cases de validação de valores' },
    ],
  },
  {
    version: '1.0.0',
    date: '2024-12-01',
    changes: [
      { type: 'feature', description: 'Lançamento inicial da API FurionPay' },
      { type: 'feature', description: 'Endpoint para criação de PIX instantâneo' },
      { type: 'feature', description: 'Endpoint para consulta de status de transações' },
      { type: 'feature', description: 'Sistema de webhooks para notificações em tempo real' },
      { type: 'feature', description: 'Autenticação via API Key' },
    ],
  },
];

const typeConfig = {
  feature: {
    label: 'Novo',
    icon: Sparkles,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  improvement: {
    label: 'Melhoria',
    icon: Zap,
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  fix: {
    label: 'Correção',
    icon: Bug,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  breaking: {
    label: 'Breaking',
    icon: AlertTriangle,
    color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
};

export const ChangelogSection = () => {
  return (
    <section id="changelog" className="scroll-mt-20 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">Changelog</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            Histórico
          </span>
        </div>
        <p className="text-muted-foreground">
          Acompanhe as atualizações e melhorias da API FurionPay.
        </p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-8">
          {changelog.map((entry, index) => (
            <div key={entry.version} className="relative pl-12">
              {/* Timeline dot */}
              <div className={cn(
                'absolute left-0 flex items-center justify-center h-10 w-10 rounded-full border-4 border-background',
                index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <GitCommit className="h-4 w-4" />
              </div>

              {/* Version card */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold font-mono">v{entry.version}</span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        Atual
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Changes */}
                <div className="p-4 sm:p-6 space-y-3">
                  {entry.changes.map((change, changeIndex) => {
                    const config = typeConfig[change.type];
                    const Icon = config.icon;
                    
                    return (
                      <div key={changeIndex} className="flex items-start gap-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0',
                          config.color
                        )}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                        <p className="text-sm text-muted-foreground">{change.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
