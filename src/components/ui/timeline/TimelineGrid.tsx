"use client";

import { useRef } from "react";
import { calculateItemPosition, generateTimelineColumns } from "@/lib/utils/timeline";
import type { TimelineConfig } from "@/lib/utils/timeline";
import type { RequirementWithAllocations, TimelineCallbacks } from "./types";
import type { Tables } from "@/types/supabase";
import { RequirementBlock } from "./RequirementBlock";
import { TimelineDataService } from "../../../lib/services/TimelineDataService";

interface TimelineGridProps {
  config: TimelineConfig;
  requirementsWithAllocations: RequirementWithAllocations[];
  allocations: Tables<"project_allocations_detailed">[];
  projectStartDate?: Date;
  projectEndDate?: Date;
  callbacks: TimelineCallbacks;
}

export function TimelineGrid({ 
  config, 
  requirementsWithAllocations, 
  allocations,
  projectStartDate, 
  projectEndDate, 
  callbacks 
}: TimelineGridProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const columns = generateTimelineColumns(config);
  const timelineWidth = columns.length * 133; // Each column is approximately 133px wide
  const totalHeight = TimelineDataService.calculateTotalHeight(requirementsWithAllocations);

  return (
    <div className="overflow-x-auto border rounded-lg">
      <div style={{ width: `${timelineWidth}px` }}>
        {/* Column Headers */}
        <div className="flex border-b border-gray-200 pb-2 bg-gray-50 sticky top-0 z-10">
          {columns.map((column, index) => (
            <div
              key={index}
              className="text-center text-xs font-medium text-gray-600"
              style={{ width: `${timelineWidth / columns.length}px` }}
            >
              {column.label}
            </div>
          ))}
        </div>

        {/* Timeline Content */}
        <div 
          ref={timelineRef}
          className="relative bg-white"
          style={{ height: `${Math.max(totalHeight, 400)}px` }}
        >
          {/* Project Start/End Date Markers */}
          {projectStartDate && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-green-500 z-10"
              style={{
                left: `${calculateItemPosition(
                  { 
                    id: 'project-start', 
                    title: 'Project Start', 
                    startDate: projectStartDate, 
                    endDate: projectStartDate, 
                    type: 'requirement' 
                  },
                  config.startDate,
                  config.endDate,
                  timelineWidth
                ).left}px`,
              }}
            />
          )}
          
          {projectEndDate && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10"
              style={{
                left: `${calculateItemPosition(
                  { 
                    id: 'project-end', 
                    title: 'Project End', 
                    startDate: projectEndDate, 
                    endDate: projectEndDate, 
                    type: 'requirement' 
                  },
                  config.startDate,
                  config.endDate,
                  timelineWidth
                ).left}px`,
              }}
            />
          )}

          {requirementsWithAllocations.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              No requirements defined yet
            </div>
          ) : (
            requirementsWithAllocations.map((reqWithAllocs, index) => (
              <RequirementBlock
                key={reqWithAllocs.id}
                reqWithAllocs={reqWithAllocs}
                blockIndex={index}
                config={config}
                timelineWidth={timelineWidth}
                allocations={allocations}
                callbacks={callbacks}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}