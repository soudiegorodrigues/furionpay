import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
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
  Percent,
  Link2,
  X
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
  onUpdateConnection: (field: 'next_step_on_accept' | 'next_step_on_decline', targetId: string | null) => void;
  onStartConnection: (sourceId: string, type: 'accept' | 'decline') => void;
  products: Product[];
  allSteps: FunnelStep[];
  metrics?: StepMetrics;
  isDraggable?: boolean;
  isInConnectionMode?: boolean;
  isConnectionTarget?: boolean;
  onClickToConnect?: () => void;
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
  onUpdateConnection,
  onStartConnection,
  products,
  allSteps,
  metrics,
  isDraggable = true,
  isInConnectionMode = false,
  isConnectionTarget = false,
  onClickToConnect
}: FunnelStepBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<Partial<FunnelStep>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({ 
    id: step.id,
    disabled: !isDraggable || isExpanded || isInConnectionMode,
  });

  const config = STEP_CONFIG[step.step_type];
  const Icon = ICONS[config.icon as keyof typeof ICONS];
  const otherSteps = allSteps.filter((s) => s.id !== step.id);

  // Get connected step names
  const acceptStep = allSteps.find(s => s.id === step.next_step_on_accept);
  const declineStep = allSteps.find(s => s.id === step.next_step_on_decline);

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
    if (!isInConnectionMode) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleStartAcceptConnection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStartConnection(step.id, 'accept');
  };

  const handleStartDeclineConnection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStartConnection(step.id, 'decline');
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isConnectionTarget && onClickToConnect) {
      e.preventDefault();
      e.stopPropagation();
      onClickToConnect();
    }
  };

  const handleRemoveConnection = (e: React.MouseEvent, type: 'accept' | 'decline') => {
    e.stopPropagation();
    const field = type === 'accept' ? 'next_step_on_accept' : 'next_step_on_decline';
    onUpdateConnection(field, null);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative group',
        isDragging && 'z-50 opacity-90',
        isDraggable && !isExpanded && !isInConnectionMode && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <Card
        className={cn(
          'relative transition-all duration-200 border-2',
          isExpanded 
            ? `${config.borderColor} shadow-lg ring-2 ring-offset-2 ring-offset-background` 
            : 'border-border hover:border-muted-foreground/50',
          isDragging && 'shadow-2xl scale-105',
          !step.is_active && 'opacity-60',
          isConnectionTarget && 'ring-2 ring-emerald-500 ring-offset-2 cursor-pointer hover:ring-4 animate-pulse border-emerald-500'
        )}
        onClick={handleCardClick}
      >
        {/* Drag handle */}
        <div
          {...(isDraggable && !isExpanded && !isInConnectionMode ? { ...attributes, ...listeners } : {})}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-muted/50 rounded-l-lg transition-opacity",
            isDraggable && !isExpanded && !isInConnectionMode
              ? "cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100" 
              : "opacity-50"
          )}
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
            if (!isInConnectionMode) {
              onToggleActive(!step.is_active);
            }
          }}
        >
          {step.is_active ? "Ativo" : "Inativo"}
        </Badge>

        {/* Content area - NOT inside trigger */}
        <div className="p-4 pl-10 sm:p-5 sm:pl-11">
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

          {/* Current Connections Display with Quick Actions - OUTSIDE trigger */}
          {step.step_type !== 'thankyou' && (
            <div className="flex flex-col gap-1.5 mb-3 text-xs">
              {/* Accept Connection */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-muted-foreground shrink-0">Aceite:</span>
                <span className="font-medium truncate flex-1">
                  {acceptStep ? (acceptStep.title || STEP_CONFIG[acceptStep.step_type].label) : 'Não conectado'}
                </span>
                {acceptStep ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                      onClick={handleStartAcceptConnection}
                      disabled={isInConnectionMode}
                    >
                      <Link2 className="h-3 w-3 mr-0.5" />
                      Trocar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleRemoveConnection(e, 'accept')}
                      disabled={isInConnectionMode}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 shrink-0"
                    onClick={handleStartAcceptConnection}
                    disabled={otherSteps.length === 0 || isInConnectionMode}
                  >
                    <Link2 className="h-3 w-3 mr-0.5" />
                    Ligar
                  </Button>
                )}
              </div>
              
              {/* Decline Connection */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-muted-foreground shrink-0">Recusa:</span>
                <span className="font-medium truncate flex-1">
                  {declineStep ? (declineStep.title || STEP_CONFIG[declineStep.step_type].label) : 'Não conectado'}
                </span>
                {declineStep ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                      onClick={handleStartDeclineConnection}
                      disabled={isInConnectionMode}
                    >
                      <Link2 className="h-3 w-3 mr-0.5" />
                      Trocar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleRemoveConnection(e, 'decline')}
                      disabled={isInConnectionMode}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 shrink-0"
                    onClick={handleStartDeclineConnection}
                    disabled={otherSteps.length === 0 || isInConnectionMode}
                  >
                    <Link2 className="h-3 w-3 mr-0.5" />
                    Ligar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Collapsible - only footer is trigger */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <div 
              className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 cursor-pointer" 
              onClick={handleExpand}
            >
              {/* Footer - This is the trigger */}
              <div className="flex items-center justify-between border-t pt-3">
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
                    if (!isInConnectionMode) {
                      onDelete();
                    }
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

                  {/* Connection Buttons */}
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" />
                      <span>Conectar Próximas Etapas</span>
                    </div>
                    
                    {/* Accept Connection */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          Ao Aceitar
                        </Label>
                        {acceptStep && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleRemoveConnection(e, 'accept')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {acceptStep ? (
                        <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-xs">
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-700 font-medium">
                            {acceptStep.title || STEP_CONFIG[acceptStep.step_type].label}
                          </span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                          onClick={handleStartAcceptConnection}
                          disabled={otherSteps.length === 0}
                        >
                          <Link2 className="h-3 w-3 mr-1.5" />
                          Conectar Aceite
                        </Button>
                      )}
                    </div>

                    {/* Decline Connection */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          Ao Recusar
                        </Label>
                        {declineStep && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleRemoveConnection(e, 'decline')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {declineStep ? (
                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs">
                          <Check className="h-3 w-3 text-amber-600" />
                          <span className="text-amber-700 font-medium">
                            {declineStep.title || STEP_CONFIG[declineStep.step_type].label}
                          </span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                          onClick={handleStartDeclineConnection}
                          disabled={otherSteps.length === 0}
                        >
                          <Link2 className="h-3 w-3 mr-1.5" />
                          Conectar Recusa
                        </Button>
                      )}
                    </div>
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

        {/* Step type indicator */}
        <div className={cn(
          "absolute -top-2 -left-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-md",
          config.color
        )}>
          <Icon className="h-3 w-3" />
        </div>
      </Card>
    </div>
  );
}