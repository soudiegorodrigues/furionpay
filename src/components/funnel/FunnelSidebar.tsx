import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Shuffle, 
  CheckCircle,
  Search,
  MoreVertical,
  Copy,
  Trash2,
  Edit2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SalesFunnel, StepType, STEP_CONFIG } from './types';

interface FunnelSidebarProps {
  funnels: SalesFunnel[];
  selectedFunnelId: string | null;
  onSelectFunnel: (id: string) => void;
  onCreateFunnel: () => void;
  onDuplicateFunnel: (id: string) => void;
  onDeleteFunnel: (id: string) => void;
  onRenameFunnel: (id: string) => void;
  onAddStep: (type: StepType) => void;
}

const STEP_PALETTE: { type: StepType; Icon: typeof TrendingUp; label: string; description: string; color: string }[] = [
  { type: 'upsell', Icon: TrendingUp, label: STEP_CONFIG.upsell.label, description: STEP_CONFIG.upsell.description, color: STEP_CONFIG.upsell.color },
  { type: 'downsell', Icon: TrendingDown, label: STEP_CONFIG.downsell.label, description: STEP_CONFIG.downsell.description, color: STEP_CONFIG.downsell.color },
  { type: 'crosssell', Icon: Shuffle, label: STEP_CONFIG.crosssell.label, description: STEP_CONFIG.crosssell.description, color: STEP_CONFIG.crosssell.color },
  { type: 'thankyou', Icon: CheckCircle, label: STEP_CONFIG.thankyou.label, description: STEP_CONFIG.thankyou.description, color: STEP_CONFIG.thankyou.color },
];

export function FunnelSidebar({
  funnels,
  selectedFunnelId,
  onSelectFunnel,
  onCreateFunnel,
  onDuplicateFunnel,
  onDeleteFunnel,
  onRenameFunnel,
  onAddStep,
}: FunnelSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFunnels = funnels.filter((funnel) =>
    funnel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Funnels List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Funis Salvos</CardTitle>
            <Button size="sm" variant="outline" onClick={onCreateFunnel} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Novo
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[180px]">
            {filteredFunnels.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                {searchTerm ? 'Nenhum funil encontrado' : 'Nenhum funil criado'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFunnels.map((funnel) => (
                  <div
                    key={funnel.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group',
                      selectedFunnelId === funnel.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => onSelectFunnel(funnel.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{funnel.name}</p>
                      <p className={cn(
                        'text-xs',
                        selectedFunnelId === funnel.id 
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}>
                        {funnel.steps?.length || 0} etapas
                      </p>
                    </div>
                    <Badge 
                      variant={funnel.is_active ? 'default' : 'secondary'}
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {funnel.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity',
                            selectedFunnelId === funnel.id && 'text-primary-foreground hover:text-primary-foreground'
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRenameFunnel(funnel.id)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicateFunnel(funnel.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteFunnel(funnel.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Block Palette */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm">Adicionar Bloco</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <div className="grid grid-cols-2 gap-1.5">
            {STEP_PALETTE.map((item) => (
              <Button
                key={item.type}
                variant="outline"
                className="flex flex-col h-auto py-2 px-2 hover:border-primary hover:bg-primary/5 text-xs"
                onClick={() => onAddStep(item.type)}
                disabled={!selectedFunnelId}
              >
                <div className={cn('p-1 rounded-md mb-1', item.color)}>
                  <item.Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-medium">{item.label}</span>
              </Button>
            ))}
          </div>
          {!selectedFunnelId && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Selecione um funil primeiro
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
