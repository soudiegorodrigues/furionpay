import { FunnelStep, STEP_CONFIG } from './types';

// Dimensões reais dos elementos
const PRODUCT_CARD_WIDTH = 208;  // w-52
const PRODUCT_CARD_HEIGHT = 160; // Altura real do card do produto com conteúdo
const HANDLE_OFFSET = 12;        // Offset do handle amarelo

interface FunnelConnectionsProps {
  steps: FunnelStep[];
  productPosition: { x: number; y: number };
  cardWidth: number;
  cardHeight: number;
  draggedStepId?: string | null;
  dragDelta?: { x: number; y: number };
}

interface ConnectionLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: 'accept' | 'decline' | 'product';
  fromStepId?: string;
  toStepId: string;
}

// Helper to get visual position of a step (considering drag offset)
const getVisualPosition = (
  step: FunnelStep, 
  draggedStepId: string | null | undefined, 
  dragDelta: { x: number; y: number }
) => {
  if (step.id === draggedStepId) {
    return {
      x: step.position_x + dragDelta.x,
      y: step.position_y + dragDelta.y,
    };
  }
  return { x: step.position_x, y: step.position_y };
};

export function FunnelConnections({ 
  steps, 
  productPosition,
  cardWidth,
  cardHeight,
  draggedStepId = null,
  dragDelta = { x: 0, y: 0 },
}: FunnelConnectionsProps) {
  const lines: ConnectionLine[] = [];

  // Find first step to connect from product
  const firstStep = steps.find(s => s.position === 0);
  if (firstStep) {
    const firstStepPos = getVisualPosition(firstStep, draggedStepId, dragDelta);
    lines.push({
      from: { 
        x: productPosition.x + PRODUCT_CARD_WIDTH / 2, // Centro do card produto
        y: productPosition.y + PRODUCT_CARD_HEIGHT + HANDLE_OFFSET // Sai do handle vermelho
      },
      to: { 
        x: firstStepPos.x + cardWidth / 2, 
        y: firstStepPos.y - 4 // Entra pelo topo do card
      },
      type: 'product',
      toStepId: firstStep.id,
    });
  }

  // Build connections from step configs - linear mode (single line per step)
  steps.forEach(step => {
    // Only draw one line per step (use accept as source of truth since both are the same in linear mode)
    if (step.next_step_on_accept) {
      const targetStep = steps.find(s => s.id === step.next_step_on_accept);
      if (targetStep) {
        const fromPos = getVisualPosition(step, draggedStepId, dragDelta);
        const toPos = getVisualPosition(targetStep, draggedStepId, dragDelta);
        lines.push({
          from: { 
            x: fromPos.x + cardWidth, 
            y: fromPos.y + cardHeight / 2 
          },
          to: { 
            x: toPos.x, 
            y: toPos.y + cardHeight / 2 
          },
          type: 'accept', // Use 'accept' color (blue/green) for the single line
          fromStepId: step.id,
          toStepId: targetStep.id,
        });
      }
    }
  });

  // Calculate path with curves - responsive to direction
  const getPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    // Se a diferença Y for maior que X, usa curva vertical (conexão mais vertical)
    if (Math.abs(dy) > Math.abs(dx) * 0.8) {
      const controlY = Math.min(Math.abs(dy) * 0.4, 60);
      return `M ${from.x} ${from.y} C ${from.x} ${from.y + controlY}, ${to.x} ${to.y - controlY}, ${to.x} ${to.y}`;
    }
    
    // Senão, curva horizontal padrão
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 80);
    return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
  };

  const getColor = (type: 'accept' | 'decline' | 'product') => {
    switch (type) {
      case 'accept': return 'hsl(var(--chart-2))'; // green
      case 'decline': return 'hsl(var(--chart-4))'; // orange
      case 'product': return 'hsl(var(--primary))';
    }
  };

  const getGlowColor = (type: 'accept' | 'decline' | 'product') => {
    switch (type) {
      case 'accept': return '#10b981';
      case 'decline': return '#f59e0b';
      case 'product': return 'hsl(var(--primary))';
    }
  };

  if (lines.length === 0) return null;

  // Calculate SVG bounds
  const allPoints = lines.flatMap(l => [l.from, l.to]);
  const maxX = Math.max(...allPoints.map(p => p.x)) + 50;
  const maxY = Math.max(...allPoints.map(p => p.y)) + 50;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: maxX, height: maxY, zIndex: -1 }}
    >
      <defs>
        {/* Arrow markers */}
        <marker
          id="arrow-accept"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
        </marker>
        <marker
          id="arrow-decline"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
        </marker>
        <marker
          id="arrow-product"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="hsl(var(--primary))" />
        </marker>

        {/* Glow filters */}
        <filter id="glow-accept" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-decline" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {lines.map((line, index) => (
        <g key={index}>
          {/* Glow effect (only for step-to-step connections) */}
          {line.type !== 'product' && (
            <path
              d={getPath(line.from, line.to)}
              fill="none"
              stroke={getGlowColor(line.type)}
              strokeWidth="4"
              opacity="0.3"
              filter={`url(#glow-${line.type})`}
            />
          )}

          {/* Main line */}
          <path
            d={getPath(line.from, line.to)}
            fill="none"
            stroke={getColor(line.type)}
            strokeWidth="2"
            strokeDasharray="8 4"
            markerEnd={`url(#arrow-${line.type})`}
          />
        </g>
      ))}
    </svg>
  );
}
