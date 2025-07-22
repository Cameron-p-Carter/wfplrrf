import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectGapDataPoint {
  date: string;
  [projectId: string]: number | string;
}

interface ProjectInfo {
  id: string;
  name: string;
  color: string;
}

interface ProjectGapsChartProps {
  data: ProjectGapDataPoint[];
  projects: ProjectInfo[];
  loading?: boolean;
  height?: number;
}

export function ProjectGapsChart({ data, projects, loading = false, height = 120 }: ProjectGapsChartProps) {
  if (loading) {
    return (
      <div className="w-full" style={{ height }}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!data || data.length === 0 || projects.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No project gaps data available
      </div>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filter out zero values for cleaner tooltip
      const nonZeroPayload = payload.filter((item: any) => item.value > 0);
      
      if (nonZeroPayload.length === 0) {
        return (
          <div className="bg-background border border-border rounded-lg shadow-lg p-3">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">No gaps</p>
          </div>
        );
      }

      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <div className="space-y-1">
            {nonZeroPayload.map((item: any) => {
              const project = projects.find(p => p.id === item.dataKey);
              return (
                <p key={item.dataKey} className="text-sm">
                  <span className="font-medium" style={{ color: item.color }}>
                    {project?.name}:
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {item.value} gap{item.value !== 1 ? 's' : ''}
                  </span>
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend that shows project names
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-4 justify-center mt-2">
        {payload?.map((entry: any) => {
          const project = projects.find(p => p.id === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                {project?.name}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 40, // More space for legend
          }}
        >
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
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: "hsl(var(--muted-foreground))" 
            }}
            tickFormatter={(value) => `${value}`}
            width={25}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          
          {projects.map((project) => (
            <Line
              key={project.id}
              type="monotone"
              dataKey={project.id}
              stroke={project.color}
              strokeWidth={2}
              dot={{ 
                fill: project.color, 
                strokeWidth: 2, 
                stroke: "white",
                r: 3
              }}
              activeDot={{ 
                r: 5, 
                fill: project.color,
                stroke: "white",
                strokeWidth: 2
              }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}