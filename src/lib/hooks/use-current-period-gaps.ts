"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAllProjectGaps, getGapSummary } from "@/lib/supabase/business-logic/gap-analysis";
import { getProjects } from "@/lib/supabase";
import { useTimePeriod } from "@/lib/providers/time-period-provider";
import type { Tables } from "@/types/supabase";

interface CurrentPeriodGap {
  project_id: string;
  project_name: string;
  role_type_id: string;
  role_type_name: string;
  required_count: number;
  allocated_count: number;
  gap_count: number;
  start_date: string;
  end_date: string;
}

interface GapsByRole {
  role_type_id: string;
  role_type_name: string;
  total_gaps: number;
  projects_affected: number;
}

export function useCurrentPeriodGaps() {
  const [currentPeriodGaps, setCurrentPeriodGaps] = useState<CurrentPeriodGap[]>([]);
  const [gapsByRole, setGapsByRole] = useState<GapsByRole[]>([]);
  const [projectsWithGaps, setProjectsWithGaps] = useState<(Tables<"projects"> & { gap_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { range } = useTimePeriod();

  const fetchCurrentPeriodGaps = async () => {
    try {
      setLoading(true);
      setError(null);

      const [allProjectGaps, projects] = await Promise.all([
        getAllProjectGaps(),
        getProjects()
      ]);

      const periodStart = new Date(range.startDate);
      const periodEnd = new Date(range.endDate);

      // Filter gaps that overlap with the current time period
      const currentGaps: CurrentPeriodGap[] = [];
      const projectGapCounts = new Map<string, number>();
      
      for (const projectGap of allProjectGaps) {
        const project = projects.find(p => p.id === projectGap.projectId);
        if (!project) continue;

        for (const gap of projectGap.gaps) {
          const gapStart = new Date(gap.start_date);
          const gapEnd = new Date(gap.end_date);
          
          // Check if gap overlaps with current period
          const overlaps = gapStart <= periodEnd && gapEnd >= periodStart;
          
          if (overlaps) {
            currentGaps.push({
              project_id: project.id,
              project_name: project.name,
              role_type_id: gap.role_type_id,
              role_type_name: gap.role_type_name,
              required_count: gap.required_count,
              allocated_count: gap.allocated_count,
              gap_count: gap.gap_count,
              start_date: gap.start_date,
              end_date: gap.end_date,
            });

            // Count gaps per project
            const currentCount = projectGapCounts.get(project.id) || 0;
            projectGapCounts.set(project.id, currentCount + gap.gap_count);
          }
        }
      }

      // Group gaps by role type
      const roleGapsMap = new Map<string, { role_type_name: string; total_gaps: number; projects: Set<string> }>();
      
      for (const gap of currentGaps) {
        const existing = roleGapsMap.get(gap.role_type_id) || {
          role_type_name: gap.role_type_name,
          total_gaps: 0,
          projects: new Set<string>()
        };
        
        existing.total_gaps += gap.gap_count;
        existing.projects.add(gap.project_id);
        roleGapsMap.set(gap.role_type_id, existing);
      }

      const roleGaps: GapsByRole[] = Array.from(roleGapsMap.entries()).map(([role_type_id, data]) => ({
        role_type_id,
        role_type_name: data.role_type_name,
        total_gaps: data.total_gaps,
        projects_affected: data.projects.size
      }));

      // Create projects with gaps list
      const projectsWithGapsList = Array.from(projectGapCounts.entries())
        .map(([projectId, gapCount]) => {
          const project = projects.find(p => p.id === projectId);
          return project ? { ...project, gap_count: gapCount } : null;
        })
        .filter(Boolean) as (Tables<"projects"> & { gap_count: number })[];

      setCurrentPeriodGaps(currentGaps);
      setGapsByRole(roleGaps);
      setProjectsWithGaps(projectsWithGapsList);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch current period gaps";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentPeriodGaps();
  }, [range.startDate, range.endDate]);

  const getTotalGaps = () => {
    return currentPeriodGaps.reduce((sum, gap) => sum + gap.gap_count, 0);
  };

  const getCriticalGaps = () => {
    return currentPeriodGaps.filter(gap => 
      gap.gap_count > 1 || 
      new Date(gap.start_date) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Within 2 weeks
    );
  };

  return {
    currentPeriodGaps,
    gapsByRole,
    projectsWithGaps,
    totalGaps: getTotalGaps(),
    criticalGaps: getCriticalGaps(),
    loading,
    error,
    refetch: fetchCurrentPeriodGaps,
  };
}