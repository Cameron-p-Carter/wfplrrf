"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getProjects, getProjectGaps } from "@/lib/supabase";
import { useTimePeriod } from "@/lib/providers/time-period-provider";

interface ProjectSuggestion {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  gap_count: number;
  matching_gaps: Array<{
    role_type_name: string;
    start_date: string;
    end_date: string;
    gap_count: number;
  }>;
}

export function useProjectSuggestions() {
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { range, period } = useTimePeriod();

  const fetchSuggestions = useCallback(async (personRoleTypeName: string) => {
    try {
      setLoading(true);
      setError(null);

      const allProjects = await getProjects();
      if (allProjects.length === 0) {
        setSuggestions([]);
        return;
      }

      // Filter projects that are active or upcoming in the selected time period
      const startDate = new Date(range.startDate);
      let endDate = new Date(range.endDate);
      
      // Limit "all-future" to max 1 year
      if (period === "all-future") {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (endDate > oneYearFromNow) {
          endDate = oneYearFromNow;
        }
      }

      const relevantProjects = allProjects.filter(project => {
        const projectStart = new Date(project.start_date);
        const projectEnd = new Date(project.end_date);
        // Include if project overlaps with our time period
        return projectStart <= endDate && projectEnd >= startDate;
      });

      if (relevantProjects.length === 0) {
        setSuggestions([]);
        return;
      }

      const projectSuggestions: ProjectSuggestion[] = [];

      // Check each project for matching gaps
      for (const project of relevantProjects) {
        try {
          const projectGaps = await getProjectGaps(project.id);
          
          // Filter gaps that overlap with our time period and match the person's role
          const matchingGaps = projectGaps.filter(gap => {
            const gapStart = new Date(gap.start_date);
            const gapEnd = new Date(gap.end_date);
            
            // Check if gap overlaps with time period
            const overlapsTimePeriod = gapStart <= endDate && gapEnd >= startDate;
            
            // Check if role type matches (case insensitive)
            const roleMatches = gap.role_type_name?.toLowerCase() === personRoleTypeName.toLowerCase();
            
            return overlapsTimePeriod && roleMatches;
          });

          if (matchingGaps.length > 0) {
            const totalGapCount = matchingGaps.reduce((sum, gap) => sum + gap.gap_count, 0);
            
            projectSuggestions.push({
              id: project.id,
              name: project.name,
              start_date: project.start_date,
              end_date: project.end_date,
              gap_count: totalGapCount,
              matching_gaps: matchingGaps.map(gap => ({
                role_type_name: gap.role_type_name,
                start_date: gap.start_date,
                end_date: gap.end_date,
                gap_count: gap.gap_count
              }))
            });
          }
        } catch (gapError) {
          console.warn(`Failed to get gaps for project ${project.id}:`, gapError);
          continue;
        }
      }

      // Sort by total gap count descending (projects with most gaps first)
      projectSuggestions.sort((a, b) => b.gap_count - a.gap_count);

      setSuggestions(projectSuggestions);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch project suggestions";
      setError(message);
      toast.error(message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [range.startDate, range.endDate, period]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    clearSuggestions,
  };
}