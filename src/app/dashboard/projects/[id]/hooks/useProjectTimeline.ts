import { useState, useEffect } from "react";
import { getDefaultTimelineRange, getDataBasedTimelineRange, type TimelineConfig, type TimelineItem } from "@/lib/utils/timeline";
import type { Tables } from "@/types/supabase";

export function useProjectTimeline(
  requirements: Tables<"project_requirements_detailed">[],
  allocations: Tables<"project_allocations_detailed">[],
  gaps: any[],
  project: Tables<"projects"> | null,
  requirementsLoading: boolean,
  allocationsLoading: boolean
) {
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>(() => ({
    ...getDefaultTimelineRange(),
    granularity: 'month' as const,
  }));

  // Update timeline range when data changes
  useEffect(() => {
    if (!requirementsLoading && !allocationsLoading && requirements && allocations && (requirements.length > 0 || allocations.length > 0)) {
      const dataBasedRange = getDataBasedTimelineRange(
        requirements,
        allocations,
        project ? new Date(project.start_date) : undefined,
        project ? new Date(project.end_date) : undefined
      );
      
      setTimelineConfig(prev => ({
        ...prev,
        startDate: dataBasedRange.startDate,
        endDate: dataBasedRange.endDate,
      }));
    }
  }, [requirements, allocations, project, requirementsLoading, allocationsLoading]);

  const generateTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];
    
    // Add requirements as timeline items
    if (requirements) {
      requirements.forEach((req) => {
        if (req.start_date && req.end_date && req.role_type_name) {
          items.push({
            id: req.id!,
            title: `${req.role_type_name} (${req.required_count} needed)`,
            startDate: new Date(req.start_date),
            endDate: new Date(req.end_date),
            type: 'requirement',
            metadata: req,
          });
        }
      });
    }
    
    // Add allocations as timeline items
    if (allocations) {
      allocations.forEach((alloc) => {
        if (alloc.start_date && alloc.end_date && alloc.person_name) {
          items.push({
            id: alloc.id!,
            title: `${alloc.person_name} (${alloc.role_type_name})`,
            startDate: new Date(alloc.start_date),
            endDate: new Date(alloc.end_date),
            type: 'allocation',
            percentage: alloc.allocation_percentage || 0,
            metadata: alloc,
          });
        }
      });
    }
    
    // Add gaps as timeline items
    if (gaps) {
      gaps.forEach((gap, index) => {
        if (gap.start_date && gap.end_date && gap.role_type_name) {
          items.push({
            id: `gap-${index}`,
            title: `${gap.role_type_name} Gap (${gap.gap_count.toFixed(1)} needed)`,
            startDate: new Date(gap.start_date),
            endDate: new Date(gap.end_date),
            type: 'gap',
            metadata: gap,
          });
        }
      });
    }
    
    return items;
  };

  return {
    timelineConfig,
    setTimelineConfig,
    timelineItems: generateTimelineItems(),
  };
}