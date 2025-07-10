"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { TimelineProps, TimelineCallbacks } from "./types";
import { TimelineDataService } from "../../../lib/services/TimelineDataService";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineControls } from "./TimelineControls";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineLegend } from "./TimelineLegend";

interface ProjectTimelineProps extends TimelineProps, TimelineCallbacks {}

export function ProjectTimeline({ 
  title, 
  requirements,
  allocations,
  config, 
  onConfigChange, 
  onAllocatePosition,
  onEditPosition,
  onDeleteOrphanedAllocation,
  onEditAllocation,
  onDeleteAllocation,
  onEditRequirement,
  onDeleteRequirement,
  className,
  projectStartDate,
  projectEndDate
}: ProjectTimelineProps) {

  // Navigation handlers
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!onConfigChange) return;
    
    const { startDate, endDate } = config;
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

  const handleGranularityChange = (granularity: 'week' | 'month') => {
    if (onConfigChange) {
      onConfigChange({ ...config, granularity });
    }
  };

  // Generate requirements with allocations using the service
  const requirementsWithAllocations = useMemo(
    () => TimelineDataService.generateRequirementsWithAllocations(requirements, allocations),
    [requirements, allocations]
  );

  // Bundle callbacks for easier passing
  const callbacks: TimelineCallbacks = {
    onConfigChange,
    onAllocatePosition,
    onEditPosition,
    onDeleteOrphanedAllocation,
    onEditAllocation,
    onDeleteAllocation,
    onEditRequirement,
    onDeleteRequirement,
  };

  return (
    <Card className={className}>
      <TimelineHeader 
        title={title}
        config={config}
        onNavigate={handleNavigate}
      />
      
      <CardContent>
        <div className="space-y-4">
          <TimelineControls 
            config={config}
            onGranularityChange={handleGranularityChange}
          />
          
          <TimelineGrid 
            config={config}
            requirementsWithAllocations={requirementsWithAllocations}
            allocations={allocations}
            projectStartDate={projectStartDate}
            projectEndDate={projectEndDate}
            callbacks={callbacks}
          />

          <TimelineLegend />
        </div>
      </CardContent>
    </Card>
  );
}