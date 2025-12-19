import React from 'react';

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  colorScheme?: 'green' | 'red' | 'blue' | 'purple' | 'rainbow';
  size?: number;
  formatValue?: (value: number) => string;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  colorScheme = 'rainbow',
  size = 120,
  formatValue = formatCurrency,
}) => {
  // Normalize value to 0-100 range
  const normalizedValue = Math.max(min, Math.min(max, value));
  // Handle case where max equals min (avoid division by zero)
  const percentage = (max - min) === 0 ? 50 : ((normalizedValue - min) / (max - min)) * 100;
  // Calculate needle angle (from -90 to 90 degrees, where -90 is min and 90 is max)
  const needleAngle = -90 + (percentage / 100) * 180;
  
  // Center of the gauge
  const cx = 50;
  const cy = 50;
  const radius = 40;
  
  // Get segment colors based on color scheme
  const getSegmentColors = () => {
    switch (colorScheme) {
      case 'green':
        return ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'];
      case 'red':
        return ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444'];
      case 'blue':
        return ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6'];
      case 'purple':
        return ['#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7'];
      default: // rainbow
        return ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
    }
  };
  
  const segmentColors = getSegmentColors();
  
  // Create arc segments
  const createArc = (startPercent: number, endPercent: number) => {
    const startAngle = -180 + (startPercent / 100) * 180;
    const endAngle = -180 + (endPercent / 100) * 180;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    
    const largeArc = endPercent - startPercent > 50 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };
  
  const segments = [
    { start: 0, end: 20 },
    { start: 20, end: 40 },
    { start: 40, end: 60 },
    { start: 60, end: 80 },
    { start: 80, end: 100 },
  ];

  return (
    <div className="relative" style={{ width: size, height: size * 0.75 }}>
      <svg
        viewBox="0 0 100 75"
        width={size}
        height={size * 0.75}
        className="overflow-visible"
      >
        {/* Background arc segments */}
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createArc(segment.start, segment.end)}
            fill="none"
            stroke={segmentColors[index]}
            strokeWidth="8"
            strokeLinecap="butt"
          />
        ))}
        
        {/* Needle */}
        <g
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 0.5s ease-out',
          }}
        >
          <polygon
            points={`${cx - 2},${cy} ${cx},${cy - 24} ${cx + 2},${cy}`}
            fill="hsl(var(--foreground))"
          />
        </g>
        
        {/* Center circle */}
        <circle
          cx={cx}
          cy={cy}
          r="5"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
        />
        
        {/* Min label */}
        <text
          x="12"
          y="56"
          fontSize="5"
          fill="hsl(var(--muted-foreground))"
          textAnchor="middle"
        >
          {formatValue(min)}
        </text>
        
        {/* Max label */}
        <text
          x="88"
          y="56"
          fontSize="5"
          fill="hsl(var(--muted-foreground))"
          textAnchor="middle"
        >
          {formatValue(max)}
        </text>
        
        {/* Value label */}
        <text
          x={cx}
          y="70"
          fontSize="11"
          fontWeight="bold"
          fill="hsl(var(--foreground))"
          textAnchor="middle"
        >
          {label || value.toFixed(0)}
        </text>
      </svg>
    </div>
  );
};
