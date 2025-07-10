"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { 
  TimelineItem, 
  TimelineConfig, 
  generateTimelineColumns, 
  calculateItemPosition, 
  getTimelineItemColor, 
  groupTimelineItems,
  formatTimelineTooltip 
} from "@/lib/utils/timeline";

interface TimelineProps {
  title: string;
  items: TimelineItem[];
  config: TimelineConfig;
  onItemClick?: (item: TimelineItem) => void;
  onConfigChange?: (config: TimelineConfig) => void;
  className?: string;
}

export function Timeline({ title, items, config, onItemClick, onConfigChange, className }: TimelineProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const columns = generateTimelineColumns(config);
  const groupedItems = groupTimelineItems(items);
  const timelineWidth = 800; // Fixed width for calculations
  
  const handleGranularityChange = (granularity: 'week' | 'month') => {
    if (onConfigChange) {
      onConfigChange({ ...config, granularity });
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!onConfigChange) return;
    
    const { startDate, endDate, granularity } = config;
    const diffMs = endDate.getTime() - startDate.getTime();
    
    let newStartDate: Date;
    let newEndDate: Date;
    
    if (direction === 'prev') {
      newStartDate = new Date(startDate.getTime() - diffMs);
      newEndDate = new Date(endDate.getTime() - diffMs);
    } else {
      newStartDate = new Date(startDate.getTime() + diffMs);
      newEndDate = new Date(endDate.getTime() + diffMs);
    }
    
    onConfigChange({
      ...config,
      startDate: newStartDate,
      endDate: newEndDate,
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGranularityChange('week')}
                className={config.granularity === 'week' ? 'bg-primary text-primary-foreground' : ''}
              >
                Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGranularityChange('month')}
                className={config.granularity === 'month' ? 'bg-primary text-primary-foreground' : ''}
              >
                Month
              </Button>
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline Header */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {config.startDate.toLocaleDateString()} - {config.endDate.toLocaleDateString()}
            </span>
          </div>
          
          {/* Column Headers */}
          <div className="relative">
            <div className="flex border-b border-gray-200 pb-2">
              {columns.map((column, index) => (
                <div
                  key={index}
                  className="flex-1 text-center text-xs font-medium text-gray-600"
                  style={{ minWidth: `${timelineWidth / columns.length}px` }}
                >
                  {column.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Content */}
          <div className="relative" style={{ minHeight: `${Math.max(groupedItems.length * 40, 80)}px` }}>
            {groupedItems.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                No timeline items to display
              </div>
            ) : (
              <TooltipProvider>
                {groupedItems.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="relative"
                    style={{ 
                      height: '32px', 
                      marginBottom: '8px',
                      top: `${rowIndex * 40}px`
                    }}
                  >
                    {row.map((item) => {
                      const position = calculateItemPosition(
                        item,
                        config.startDate,
                        config.endDate,
                        timelineWidth
                      );
                      const colorClass = getTimelineItemColor(item.type, item.percentage);
                      
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute h-6 border-2 rounded cursor-pointer transition-all duration-200 ${colorClass} ${
                                hoveredItem === item.id ? 'scale-105 shadow-md z-10' : 'z-0'
                              }`}
                              style={{
                                left: `${position.left}px`,
                                width: `${Math.max(position.width, 20)}px`,
                              }}
                              onClick={() => onItemClick?.(item)}
                              onMouseEnter={() => setHoveredItem(item.id)}
                              onMouseLeave={() => setHoveredItem(null)}
                            >
                              <div className="px-1 py-0.5 text-xs font-medium truncate">
                                {item.title}
                                {item.percentage && (
                                  <span className="ml-1">({item.percentage}%)</span>
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="whitespace-pre-line">
                              {formatTimelineTooltip(item)}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </TooltipProvider>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-200 border-2 border-blue-400 rounded"></div>
              <span className="text-xs">Requirements</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-200 border-2 border-green-400 rounded"></div>
              <span className="text-xs">High Allocation (≥80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-400 rounded"></div>
              <span className="text-xs">Low Allocation (&lt;80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 border-2 border-red-400 rounded"></div>
              <span className="text-xs">Over-allocation (&gt;100%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-200 border-2 border-purple-400 rounded"></div>
              <span className="text-xs">Leave</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 border-dashed rounded"></div>
              <span className="text-xs">Gaps</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
