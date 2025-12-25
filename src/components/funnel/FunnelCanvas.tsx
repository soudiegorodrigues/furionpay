import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FunnelStepBlock } from './FunnelStepBlock';
import { FunnelStep } from './types';
import { Package, ArrowDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FunnelCanvasProps {
  productName: string;
  productImage?: string | null;
  steps: FunnelStep[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onReorderSteps: (steps: FunnelStep[]) => void;
  onToggleStepActive: (stepId: string, active: boolean) => void;
  onDeleteStep: (stepId: string) => void;
  onAddStep: () => void;
}

export function FunnelCanvas({
  productName,
  productImage,
  steps,
  selectedStepId,
  onSelectStep,
  onReorderSteps,
  onToggleStepActive,
  onDeleteStep,
  onAddStep,
}: FunnelCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((step) => step.id === active.id);
      const newIndex = steps.findIndex((step) => step.id === over.id);

      const reorderedSteps = arrayMove(steps, oldIndex, newIndex).map((step, index) => ({
        ...step,
        position: index,
      }));

      onReorderSteps(reorderedSteps);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-3 min-h-[280px]">
      {/* Product Principal */}
      <div className="relative">
        <div className="w-36 sm:w-40 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-xl p-3 text-center shadow-lg">
          <div className="w-10 h-10 mx-auto rounded-lg bg-primary/20 flex items-center justify-center mb-1.5 overflow-hidden">
            {productImage ? (
              <img src={productImage} alt={productName} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-primary" />
            )}
          </div>
          <p className="font-semibold text-xs text-foreground truncate">{productName}</p>
          <p className="text-[10px] text-muted-foreground">Produto Principal</p>
        </div>
        {/* Connection line */}
        {steps.length > 0 && (
          <div className="absolute left-1/2 -bottom-3 -translate-x-1/2 w-0.5 h-3 bg-border" />
        )}
      </div>

      {/* Funnel Steps */}
      {steps.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col items-center gap-2 w-full max-w-[280px] sm:max-w-xs lg:max-w-sm">
              {steps.map((step, index) => (
                <div key={step.id} className="w-full">
                  {/* Connection arrow */}
                  {index > 0 && (
                    <div className="flex justify-center mb-1.5">
                      <div className="flex flex-col items-center">
                        <div className="w-0.5 h-3 bg-border" />
                        <ArrowDown className="h-3.5 w-3.5 text-muted-foreground -mt-0.5" />
                      </div>
                    </div>
                  )}
                  
                  <FunnelStepBlock
                    step={step}
                    isSelected={selectedStepId === step.id}
                    onSelect={() => onSelectStep(step.id)}
                    onToggleActive={(active) => onToggleStepActive(step.id, active)}
                    onDelete={() => onDeleteStep(step.id)}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-1">Nenhuma etapa no funil</p>
          <p className="text-xs text-muted-foreground mb-3">
            Adicione blocos para criar seu funil
          </p>
        </div>
      )}

      {/* Add Step Button */}
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'border-dashed border-2 hover:border-primary hover:bg-primary/5 text-xs',
          steps.length === 0 && 'mt-0'
        )}
        onClick={onAddStep}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Adicionar Etapa
      </Button>
    </div>
  );
}
