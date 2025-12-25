import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Shuffle, 
  CheckCircle, 
  GripVertical,
  Trash2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FunnelStep, STEP_CONFIG } from './types';

interface FunnelStepBlockProps {
  step: FunnelStep;
  isSelected: boolean;
  onSelect: () => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
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
  onDelete 
}: FunnelStepBlockProps) {
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

  const formatPrice = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
          'relative cursor-pointer transition-all duration-200 border-2',
          isSelected 
            ? `${config.borderColor} shadow-lg ring-2 ring-offset-2 ring-offset-background` 
            : 'border-border hover:border-muted-foreground/50',
          isDragging && 'shadow-2xl scale-105',
          !step.is_active && 'opacity-60'
        )}
        onClick={onSelect}
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
            "absolute top-3 right-3 cursor-pointer text-[10px] px-1.5 py-0.5 transition-colors",
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

        <div className="p-4 pl-10">
          {/* Header */}
          <div className="flex items-start gap-2 mb-3 pr-12">
            <div className={cn('p-1.5 rounded-md shrink-0', config.color)}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{step.title || config.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{config.description}</p>
            </div>
          </div>

          {/* Product info */}
          {step.step_type !== 'thankyou' && (
            <div className="bg-muted/50 rounded-lg p-2 mb-3">
              {step.offer_product ? (
                <div className="flex items-center gap-2">
                  {step.offer_product.image_url ? (
                    <img 
                      src={step.offer_product.image_url} 
                      alt={step.offer_product.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{step.offer_product.name}</p>
                    <div className="flex items-center gap-2">
                      {step.original_price && step.original_price > (step.offer_price || 0) && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(step.original_price)}
                        </span>
                      )}
                      <span className={cn('text-xs font-bold', config.textColor)}>
                        {formatPrice(step.offer_price)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-1">
                  Nenhum produto selecionado
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {step.timer_seconds ? `${Math.floor(step.timer_seconds / 60)}min` : 'Sem timer'}
            </Badge>
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

        {/* Position indicator */}
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
          {step.position + 1}
        </div>
      </Card>
    </div>
  );
}
