import { useState, useRef } from 'react';
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
import { FunnelConnections } from './FunnelConnections';
import { FunnelStep, StepMetrics, STEP_CONFIG } from './types';
import { Package, Plus, Move, ZoomIn, ZoomOut, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface ConnectionMode {
  sourceId: string;
  type: 'next' | 'entry';
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
  onUpdateConnection: (stepId: string, field: 'next_step_on_accept' | 'next_step_on_decline', targetId: string | null) => void;
  products: Product[];
  stepMetrics?: Record<string, StepMetrics>;
}

const CANVAS_MIN_WIDTH = 1200;
const CANVAS_MIN_HEIGHT = 800;
const GRID_SIZE = 20;

const CARD_WIDTH = 280;
const CARD_HEIGHT = 180;
const PRODUCT_POSITION = { x: 40, y: 40 };
const PRODUCT_SOURCE_ID = '__product__';

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
  onUpdateConnection,
  products,
  stepMetrics,
}: FunnelCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (connectionMode) return; // Disable drag in connection mode
    setActiveId(event.active.id as string);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (connectionMode) return;
    if (event.delta) {
      setDragOffset({
        x: event.delta.x / zoom,
        y: event.delta.y / zoom,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (connectionMode) return;
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

  const handleStartConnection = (sourceId: string, type: 'next') => {
    setConnectionMode({ sourceId, type });
  };

  const handleStartEntryConnection = () => {
    setConnectionMode({ sourceId: PRODUCT_SOURCE_ID, type: 'entry' });
  };

  const handleCancelConnection = () => {
    setConnectionMode(null);
  };

  const handleCompleteConnection = (targetId: string) => {
    if (!connectionMode) return;

    // Produto Principal -> Primeira etapa (define position = 0)
    if (connectionMode.type === 'entry') {
      const targetStep = steps.find((s) => s.id === targetId);
      if (!targetStep) {
        setConnectionMode(null);
        return;
      }

      const currentFirst = steps.find((s) => s.position === 0);
      if (currentFirst?.id === targetId) {
        setConnectionMode(null);
        return;
      }

      const updatedSteps = steps.map((s) => {
        if (s.id === targetId) return { ...s, position: 0 };
        if (currentFirst && s.id === currentFirst.id) return { ...s, position: targetStep.position };
        return s;
      });

      onReorderSteps(updatedSteps);
      setConnectionMode(null);
      return;
    }

    // Etapa -> Etapa (linear mode: save to both accept and decline)
    if (targetId === connectionMode.sourceId) return; // Can't connect to self

    // Save to BOTH fields for compatibility (linear funnel)
    onUpdateConnection(connectionMode.sourceId, 'next_step_on_accept', targetId);
    onUpdateConnection(connectionMode.sourceId, 'next_step_on_decline', targetId);
    setConnectionMode(null);
  };

  const activeStep = steps.find(s => s.id === activeId);
  const firstStep = steps.find((s) => s.position === 0);
  // Calculate canvas dimensions based on step positions
  const maxX = Math.max(CANVAS_MIN_WIDTH, ...steps.map(s => s.position_x + 320));
  const maxY = Math.max(CANVAS_MIN_HEIGHT, ...steps.map(s => s.position_y + 250));

  return (
    <div className="relative flex flex-col h-[600px]">
      {/* Connection Mode Banner */}
      {connectionMode && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-primary text-primary-foreground py-2 px-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="text-sm font-medium">
              {connectionMode.type === 'entry'
                ? 'Clique em uma etapa para definir como "Primeira etapa"'
                : 'Clique em outro card para conectar como próxima etapa'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 hover:bg-primary-foreground/20 text-primary-foreground"
            onClick={handleCancelConnection}
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className={cn(
        "absolute right-2 z-20 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg border shadow-sm p-1",
        connectionMode ? "top-12" : "top-2"
      )}>
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
        className={cn(
          "flex-1 overflow-auto bg-muted/30 relative",
          connectionMode && "cursor-crosshair"
        )}
        style={{ 
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
          marginTop: connectionMode ? '40px' : '0',
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
          {/* Connection Lines - render behind cards */}
          <FunnelConnections
            steps={steps}
            productPosition={PRODUCT_POSITION}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_HEIGHT}
          />

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            {/* Product Principal - Fixed at top */}
            <div 
              className="absolute"
              style={{ left: PRODUCT_POSITION.x, top: PRODUCT_POSITION.y }}
            >
              <div 
                className={cn(
                  "w-52 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-xl p-3 text-center shadow-lg relative",
                  connectionMode?.type === 'entry' && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <div className="w-12 h-12 mx-auto rounded-lg bg-primary/20 flex items-center justify-center mb-2 overflow-hidden">
                  {productImage ? (
                    <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-primary" />
                  )}
                </div>
                <p className="font-semibold text-sm text-foreground truncate">{productName}</p>
                <p className="text-[10px] text-muted-foreground mb-2">Produto Principal</p>
                
                {/* Primeira etapa (botão "Ligar" + clicar no card destino) */}
                {steps.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-primary/20">
                    <p className="text-[10px] text-muted-foreground mb-1.5">Primeira etapa:</p>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs font-medium truncate",
                          !firstStep && "text-muted-foreground"
                        )}
                        title={
                          firstStep
                            ? (firstStep.title || STEP_CONFIG[firstStep.step_type]?.label || firstStep.step_type)
                            : 'Não definido'
                        }
                      >
                        {firstStep
                          ? (firstStep.title || STEP_CONFIG[firstStep.step_type]?.label || firstStep.step_type)
                          : 'Não definido'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs bg-background/80"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStartEntryConnection();
                        }}
                        disabled={!!connectionMode}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        {firstStep ? 'Trocar' : 'Ligar'}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Output handle for product */}
                {steps.length > 0 && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full border-2 border-background shadow-md" />
                )}
              </div>
            </div>

            {/* Funnel Steps */}
            {steps.map((step) => {
              const isActive = step.id === activeId;
              // Don't move wrapper during drag - DragOverlay handles visual movement
              const displayX = step.position_x;
              const displayY = step.position_y;
              const isConnectionSource = connectionMode?.sourceId === step.id;
              const isConnectionTarget = connectionMode && connectionMode.sourceId !== step.id;
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    "absolute",
                    !isActive && "transition-all",
                    isConnectionSource && "ring-2 ring-primary ring-offset-2 rounded-lg",
                    isConnectionTarget && "cursor-pointer hover:ring-2 hover:ring-emerald-500 hover:ring-offset-2 rounded-lg"
                  )}
                  style={{
                    left: displayX,
                    top: displayY,
                    width: 280,
                    zIndex: isActive ? 100 : isConnectionSource ? 50 : 1,
                  }}
                  onClick={() => {
                    if (isConnectionTarget) {
                      handleCompleteConnection(step.id);
                    }
                  }}
                >
                  <FunnelStepBlock
                    step={step}
                    isSelected={selectedStepId === step.id}
                    onSelect={() => !connectionMode && onSelectStep(step.id)}
                    onToggleActive={(active) => onToggleStepActive(step.id, active)}
                    onDelete={() => onDeleteStep(step.id)}
                    onSave={onSaveStep}
                    onUpdateConnection={(field, targetId) => onUpdateConnection(step.id, field, targetId)}
                    onStartConnection={handleStartConnection}
                    products={products}
                    allSteps={steps}
                    metrics={stepMetrics?.[step.id]}
                    isDraggable={!connectionMode}
                    isInConnectionMode={!!connectionMode}
                    isConnectionTarget={!!isConnectionTarget}
                    onClickToConnect={isConnectionTarget ? () => handleCompleteConnection(step.id) : undefined}
                  />
                </div>
              );
            })}

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={null}>
              {activeStep && (
                <div 
                  className="w-[280px] opacity-80 pointer-events-none"
                  style={{ 
                    transform: `scale(${zoom})`, 
                    transformOrigin: 'top left' 
                  }}
                >
                  <FunnelStepBlock
                    step={activeStep}
                    isSelected={false}
                    onSelect={() => {}}
                    onToggleActive={() => {}}
                    onDelete={() => {}}
                    onSave={() => {}}
                    onUpdateConnection={() => {}}
                    onStartConnection={() => {}}
                    products={products}
                    allSteps={steps}
                    metrics={stepMetrics?.[activeStep.id]}
                    isDraggable={false}
                    isInConnectionMode={false}
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
          disabled={!!connectionMode}
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
