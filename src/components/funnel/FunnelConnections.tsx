import { FunnelStep, STEP_CONFIG } from './types';

interface FunnelConnectionsProps {
  steps: FunnelStep[];
  productPosition: { x: number; y: number };
  cardWidth: number;
  cardHeight: number;
}

interface ConnectionLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: 'accept' | 'decline' | 'product';
  fromStepId?: string;
  toStepId: string;
}

export function FunnelConnections({ 
  steps, 
  productPosition,
  cardWidth,
  cardHeight 
}: FunnelConnectionsProps) {
  const lines: ConnectionLine[] = [];

  // Find first step to connect from product
  const firstStep = steps.find(s => s.position === 0);
  if (firstStep) {
    lines.push({
      from: { 
        x: productPosition.x + 176 / 2, // Product card width / 2
        y: productPosition.y + 100 // Product card height
      },
      to: { 
        x: firstStep.position_x + cardWidth / 2, 
        y: firstStep.position_y 
      },
      type: 'product',
      toStepId: firstStep.id,
    });
  }

  // Build connections from step configs
  steps.forEach(step => {
    // Accept connection
    if (step.next_step_on_accept) {
      const targetStep = steps.find(s => s.id === step.next_step_on_accept);
      if (targetStep) {
        lines.push({
          from: { 
            x: step.position_x + cardWidth, 
            y: step.position_y + cardHeight * 0.35 
          },
          to: { 
            x: targetStep.position_x, 
            y: targetStep.position_y + cardHeight / 2 
          },
          type: 'accept',
          fromStepId: step.id,
          toStepId: targetStep.id,
        });
      }
    }

    // Decline connection
    if (step.next_step_on_decline) {
      const targetStep = steps.find(s => s.id === step.next_step_on_decline);
      if (targetStep) {
        lines.push({
          from: { 
            x: step.position_x + cardWidth, 
            y: step.position_y + cardHeight * 0.65 
          },
          to: { 
            x: targetStep.position_x, 
            y: targetStep.position_y + cardHeight / 2 
          },
          type: 'decline',
          fromStepId: step.id,
          toStepId: targetStep.id,
        });
      }
    }
  });

  // Calculate path with curves
  const getPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const controlOffset = Math.min(Math.abs(dx) * 0.5, 80);
    
    // Curved bezier path
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
      style={{ width: maxX, height: maxY }}
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
          {/* Glow effect */}
          <path
            d={getPath(line.from, line.to)}
            fill="none"
            stroke={getGlowColor(line.type)}
            strokeWidth="4"
            opacity="0.3"
            filter={`url(#glow-${line.type})`}
          />
          {/* Main line */}
          <path
            d={getPath(line.from, line.to)}
            fill="none"
            stroke={getColor(line.type)}
            strokeWidth="2"
            strokeDasharray={line.type === 'product' ? '8 4' : 'none'}
            markerEnd={`url(#arrow-${line.type})`}
            className="transition-all duration-300"
          />
        </g>
      ))}
    </svg>
  );
}
