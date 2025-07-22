import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
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

  // Get color based on utilization level
  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return "#ef4444"; // red
    if (utilization >= 60) return "#f97316"; // orange  
    if (utilization >= 40) return "#eab308"; // yellow
    return "#22c55e"; // green
  };

  // Get average utilization for overall color theme
  const averageUtil = data.reduce((sum, point) => sum + point.averageUtilization, 0) / data.length;
  const chartColor = getUtilizationColor(averageUtil);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const utilColor = getUtilizationColor(data.averageUtilization);
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium" style={{ color: utilColor }}>{payload[0].value}%</span> average utilization
          </p>
          <p className="text-xs text-muted-foreground">
            {data.totalPeople} people
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="utilizationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.3}
          />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: "hsl(var(--muted-foreground))" 
            }}
          />
          <YAxis 
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: "hsl(var(--muted-foreground))" 
            }}
            tickFormatter={(value) => `${value}%`}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="averageUtilization" 
            stroke={chartColor}
            strokeWidth={3}
            fill="url(#utilizationGradient)"
            dot={{ 
              fill: chartColor, 
              strokeWidth: 2, 
              stroke: "white",
              r: 4
            }}
            activeDot={{ 
              r: 6, 
              fill: chartColor,
              stroke: "white",
              strokeWidth: 2
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}