"use client";

import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import type { TimelineConfig } from "@/lib/utils/timeline";

interface TimelineControlsProps {
  config: TimelineConfig;
  onGranularityChange: (granularity: 'week' | 'month') => void;
}

export function TimelineControls({ config, onGranularityChange }: TimelineControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>
          {config.startDate.toLocaleDateString()} - {config.endDate.toLocaleDateString()}
        </span>
        <span className="text-xs">• Hover over positions to allocate or edit</span>
      </div>
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGranularityChange('week')}
          className={config.granularity === 'week' ? 'bg-primary text-primary-foreground' : ''}
          aria-pressed={config.granularity === 'week'}
        >
          Week
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGranularityChange('month')}
          className={config.granularity === 'month' ? 'bg-primary text-primary-foreground' : ''}
          aria-pressed={config.granularity === 'month'}
        >
          Month
        </Button>
      </div>
    </div>
  );
}