import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface UtilizationDataPoint {
  date: string;
  averageUtilization: number;
  totalPeople: number;
}

interface UtilizationChartProps {
  data: UtilizationDataPoint[];
  loading?: boolean;
  height?: number;
}

export function UtilizationChart({ data, loading = false, height = 120 }: UtilizationChartProps) {
  if (loading) {
    return (
      <div className="w-full" style={{ height }}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No utilization data available
      </div>
    );
  }

  const maxUtil = Math.max(...data.map(d => d.averageUtilization), 100);
  const minUtil = Math.min(...data.map(d => d.averageUtilization), 0);
  const range = maxUtil - minUtil;
  const padding = range * 0.1; // 10% padding
  const chartMax = Math.min(maxUtil + padding, 100);
  const chartMin = Math.max(minUtil - padding, 0);
  const chartRange = chartMax - chartMin;

  const width = 300;
  const chartHeight = height - 40; // Leave space for labels
  const chartPadding = 40;

  // Calculate points for the line
  const points = data.map((point, index) => {
    const x = chartPadding + (index * (width - 2 * chartPadding)) / (data.length - 1);
    const y = chartHeight - ((point.averageUtilization - chartMin) / chartRange) * chartHeight + 20;
    return { x, y, ...point };
  });

  // Generate path string for the line
  const pathD = points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '').trim();

  // Generate gradient fill path
  const fillPath = `${pathD} L ${points[points.length - 1].x} ${chartHeight + 20} L ${points[0].x} ${chartHeight + 20} Z`;

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <linearGradient id="utilizationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((value) => {
          if (value < chartMin || value > chartMax) return null;
          const y = chartHeight - ((value - chartMin) / chartRange) * chartHeight + 20;
          return (
            <g key={value}>
              <line 
                x1={chartPadding} 
                y1={y} 
                x2={width - chartPadding} 
                y2={y} 
                stroke="hsl(var(--border))" 
                strokeWidth="1" 
                opacity="0.3"
              />
              <text 
                x={chartPadding - 8} 
                y={y + 3} 
                fontSize="10" 
                fill="hsl(var(--muted-foreground))" 
                textAnchor="end"
              >
                {value}%
              </text>
            </g>
          );
        })}

        {/* Fill area under the line */}
        <path 
          d={fillPath} 
          fill="url(#utilizationGradient)" 
        />

        {/* Main line */}
        <path 
          d={pathD} 
          fill="none" 
          stroke="hsl(var(--primary))" 
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle 
              cx={point.x} 
              cy={point.y} 
              r="3" 
              fill="hsl(var(--primary))" 
              stroke="white" 
              strokeWidth="2"
            />
            {/* Tooltip on hover */}
            <circle 
              cx={point.x} 
              cy={point.y} 
              r="8" 
              fill="transparent"
              className="cursor-pointer hover:fill-black hover:fill-opacity-5"
            >
              <title>{`${point.date}: ${point.averageUtilization}% (${point.totalPeople} people)`}</title>
            </circle>
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((point, index) => {
          // Show every label for small datasets, or every other for larger ones
          const showLabel = data.length <= 6 || index % 2 === 0;
          if (!showLabel) return null;
          
          return (
            <text 
              key={`label-${index}`}
              x={point.x} 
              y={height - 5} 
              fontSize="10" 
              fill="hsl(var(--muted-foreground))" 
              textAnchor="middle"
            >
              {point.date}
            </text>
          );
        })}
      </svg>
    </div>
  );
}