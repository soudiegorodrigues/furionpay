import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp, 
  TrendingDown, 
  Shuffle, 
  CheckCircle, 
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Eye,
  Check,
  DollarSign,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FunnelStep, STEP_CONFIG, StepMetrics } from './types';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface FunnelStepBlockProps {
  step: FunnelStep;
  isSelected: boolean;
  onSelect: () => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
  onSave: (step: FunnelStep) => void;
  products: Product[];
  allSteps: FunnelStep[];
  metrics?: StepMetrics;
}

const ICONS = {
  TrendingUp,
  TrendingDown,
  Shuffle,
  CheckCircle,
};

export function FunnelStepBlock({ 
  step, 
  isSelected, 
  onSelect, 
  onToggleActive,
  onDelete,
  onSave,
  products,
  allSteps,
  metrics
}: FunnelStepBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<Partial<FunnelStep>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = STEP_CONFIG[step.step_type];
  const Icon = ICONS[config.icon as keyof typeof ICONS];
  const otherSteps = allSteps.filter((s) => s.id !== step.id);

  useEffect(() => {
    setFormData({ ...step });
    setHasChanges(false);
  }, [step.id]);


  const handleChange = (field: keyof FunnelStep, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormData((prev) => ({
        ...prev,
        offer_product_id: productId,
        offer_price: product.price,
        original_price: product.price,
        title: product.name,
      }));
      setHasChanges(true);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave({ ...step, ...formData } as FunnelStep);
    setHasChanges(false);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50 opacity-90'
      )}
    >
      <Card
        className={cn(
          'relative transition-all duration-200 border-2',
          isExpanded 
            ? `${config.borderColor} shadow-lg ring-2 ring-offset-2 ring-offset-background` 
            : 'border-border hover:border-muted-foreground/50',
          isDragging && 'shadow-2xl scale-105',
          !step.is_active && 'opacity-60'
        )}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing bg-muted/50 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Badge posicionado absoluto no canto */}
        <Badge 
          variant="outline"
          className={cn(
            "absolute top-3 right-3 cursor-pointer text-[10px] px-1.5 py-0.5 transition-colors z-10",
            step.is_active 
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20" 
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(!step.is_active);
          }}
        >
          {step.is_active ? "Ativo" : "Inativo"}
        </Badge>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="p-4 pl-10 sm:p-5 sm:pl-11 cursor-pointer" onClick={handleExpand}>
              {/* Header */}
              <div className="flex items-start gap-3 mb-3 pr-14">
                <div className={cn('p-2 rounded-md shrink-0', config.color)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base truncate">{step.title || config.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{config.description}</p>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="flex items-center gap-3 mb-3 px-2 py-1.5 bg-muted/50 rounded-lg text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  <span>{metrics?.views ?? 0}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600">
                  <Check className="h-3 w-3" />
                  <span>{metrics?.accepted ?? 0}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-medium">
                  <DollarSign className="h-3 w-3" />
                  <span>
                    {(metrics?.revenue ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 ml-auto">
                  <Percent className="h-3 w-3" />
                  <span>
                    {metrics?.views && metrics.views > 0 
                      ? ((metrics.accepted / metrics.views) * 100).toFixed(1) 
                      : '0.0'}%
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span>Configurar</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t px-4 py-4 sm:px-5 space-y-4 bg-muted/30">
              {step.step_type !== 'thankyou' ? (
                <div className="space-y-4">
                  {/* Step Name */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Nome da Etapa</Label>
                    <Input
                      type="text"
                      className="h-9 text-sm"
                      value={formData.title || ''}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="Ex: Oferta Especial VIP"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Destination URL */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">URL de Destino</Label>
                    <Input
                      type="url"
                      className="h-9 text-sm"
                      value={formData.accept_url || ''}
                      onChange={(e) => handleChange('accept_url', e.target.value)}
                      placeholder="https://..."
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                    />
                    <p className="text-xs text-muted-foreground">Para onde o cliente vai após esta etapa</p>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Etapa Ativa</Label>
                      <p className="text-xs text-muted-foreground">Ativar ou desativar esta etapa do funil</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleChange('is_active', checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Step Name */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Nome da Etapa</Label>
                    <Input
                      type="text"
                      className="h-9 text-sm"
                      value={formData.title || ''}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="Ex: Obrigado pela compra!"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Redirect URL */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">URL de Redirecionamento</Label>
                    <Input
                      type="url"
                      className="h-9 text-sm"
                      value={formData.accept_url || ''}
                      onChange={(e) => handleChange('accept_url', e.target.value)}
                      placeholder="https://..."
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL final para onde o cliente será direcionado
                    </p>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Etapa Ativa</Label>
                      <p className="text-xs text-muted-foreground">Ativar esta página de obrigado</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleChange('is_active', checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}

              {/* Save Button */}
              {hasChanges && (
                <Button size="sm" onClick={handleSave} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Position indicator */}
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
          {step.position + 1}
        </div>
      </Card>
    </div>
  );
}
