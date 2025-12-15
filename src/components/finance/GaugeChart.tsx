import React from 'react';

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  color?: string;
  size?: number;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  color = 'hsl(var(--primary))',
  size = 120,
}) => {
  // Normalize value to 0-100 range
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  
  // Calculate needle angle (from -90 to 90 degrees, where -90 is min and 90 is max)
  const needleAngle = -90 + (percentage / 100) * 180;
  
  // Center of the gauge
  const cx = 50;
  const cy = 50;
  const radius = 40;
  
  // Get color based on percentage
  const getSegmentColor = (startPercent: number) => {
    if (startPercent < 20) return '#ef4444'; // Red
    if (startPercent < 40) return '#f97316'; // Orange
    if (startPercent < 60) return '#eab308'; // Yellow
    if (startPercent < 80) return '#22c55e'; // Green
    return '#14b8a6'; // Teal
  };
  
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
    <div className="relative" style={{ width: size, height: size * 0.65 }}>
      <svg
        viewBox="0 0 100 65"
        width={size}
        height={size * 0.65}
        className="overflow-visible"
      >
        {/* Background arc segments */}
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createArc(segment.start, segment.end)}
            fill="none"
            stroke={getSegmentColor(segment.start)}
            strokeWidth="8"
            strokeLinecap="butt"
          />
        ))}
        
        {/* Needle */}
        <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`}>
          <polygon
            points={`${cx},${cy - 3} ${cx - 28},${cy} ${cx},${cy + 3}`}
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
          y="58"
          fontSize="8"
          fill="hsl(var(--muted-foreground))"
          textAnchor="middle"
        >
          min
        </text>
        
        {/* Max label */}
        <text
          x="88"
          y="58"
          fontSize="8"
          fill="hsl(var(--muted-foreground))"
          textAnchor="middle"
        >
          max
        </text>
        
        {/* Value label */}
        <text
          x={cx}
          y="62"
          fontSize="10"
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
