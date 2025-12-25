import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { FunnelStepBlock } from './FunnelStepBlock';
import { FunnelStep, StepMetrics } from './types';
import { Package, Plus, Move, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

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
  onSaveStep: (step: FunnelStep) => void;
  onUpdatePosition: (stepId: string, x: number, y: number) => void;
  products: Product[];
  stepMetrics?: Record<string, StepMetrics>;
}

const CANVAS_MIN_WIDTH = 1200;
const CANVAS_MIN_HEIGHT = 800;
const GRID_SIZE = 20;

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
  onSaveStep,
  onUpdatePosition,
  products,
  stepMetrics,
}: FunnelCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (event.delta) {
      setDragOffset({
        x: event.delta.x / zoom,
        y: event.delta.y / zoom,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const stepId = active.id as string;
    const step = steps.find(s => s.id === stepId);
    
    if (step && delta) {
      const newX = Math.max(0, Math.round((step.position_x + delta.x / zoom) / GRID_SIZE) * GRID_SIZE);
      const newY = Math.max(0, Math.round((step.position_y + delta.y / zoom) / GRID_SIZE) * GRID_SIZE);
      
      onUpdatePosition(stepId, newX, newY);
    }
    
    setActiveId(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  const activeStep = steps.find(s => s.id === activeId);

  // Calculate canvas dimensions based on step positions
  const maxX = Math.max(CANVAS_MIN_WIDTH, ...steps.map(s => s.position_x + 320));
  const maxY = Math.max(CANVAS_MIN_HEIGHT, ...steps.map(s => s.position_y + 250));

  return (
    <div className="relative flex flex-col h-[600px]">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg border shadow-sm p-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs w-12 text-center font-medium">{Math.round(zoom * 100)}%</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleZoomIn}
          disabled={zoom >= 1.5}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas Container */}
      <div 
        ref={canvasRef}
        className="flex-1 overflow-auto bg-muted/30 relative"
        style={{ 
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
        }}
      >
        <div 
          className="relative"
          style={{ 
            width: maxX * zoom,
            height: maxY * zoom,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            {/* Product Principal - Fixed at top */}
            <div 
              className="absolute"
              style={{ left: 40, top: 40 }}
            >
              <div className="w-44 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-xl p-3 text-center shadow-lg">
                <div className="w-12 h-12 mx-auto rounded-lg bg-primary/20 flex items-center justify-center mb-2 overflow-hidden">
                  {productImage ? (
                    <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-primary" />
                  )}
                </div>
                <p className="font-semibold text-sm text-foreground truncate">{productName}</p>
                <p className="text-[10px] text-muted-foreground">Produto Principal</p>
              </div>
            </div>

            {/* Funnel Steps */}
            {steps.map((step) => {
              const isActive = step.id === activeId;
              const displayX = isActive ? step.position_x + dragOffset.x : step.position_x;
              const displayY = isActive ? step.position_y + dragOffset.y : step.position_y;
              
              return (
                <div
                  key={step.id}
                  className="absolute"
                  style={{
                    left: displayX,
                    top: displayY,
                    width: 280,
                    zIndex: isActive ? 100 : 1,
                  }}
                >
                  <FunnelStepBlock
                    step={step}
                    isSelected={selectedStepId === step.id}
                    onSelect={() => onSelectStep(step.id)}
                    onToggleActive={(active) => onToggleStepActive(step.id, active)}
                    onDelete={() => onDeleteStep(step.id)}
                    onSave={onSaveStep}
                    products={products}
                    allSteps={steps}
                    metrics={stepMetrics?.[step.id]}
                    isDraggable
                  />
                </div>
              );
            })}

            {/* Drag Overlay */}
            <DragOverlay>
              {activeStep && (
                <div className="w-[280px] opacity-80 pointer-events-none">
                  <FunnelStepBlock
                    step={activeStep}
                    isSelected={false}
                    onSelect={() => {}}
                    onToggleActive={() => {}}
                    onDelete={() => {}}
                    onSave={() => {}}
                    products={products}
                    allSteps={steps}
                    metrics={stepMetrics?.[activeStep.id]}
                    isDraggable={false}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Empty State */}
          {steps.length === 0 && (
            <div 
              className="absolute flex flex-col items-center justify-center text-center"
              style={{ left: 40, top: 180 }}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm mb-1">Nenhuma etapa no funil</p>
              <p className="text-xs text-muted-foreground mb-3">
                Adicione blocos para criar seu funil
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Step Button */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
        <Button
          variant="outline"
          size="sm"
          className="border-dashed border-2 hover:border-primary hover:bg-primary/5 text-xs shadow-md bg-background"
          onClick={onAddStep}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Adicionar Etapa
        </Button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm rounded px-2 py-1 border">
        <Move className="h-3 w-3" />
        <span>Arraste os cards para organizar</span>
      </div>
    </div>
  );
}
