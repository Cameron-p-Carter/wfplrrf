"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getProjects, getProjectGaps } from "@/lib/supabase";
import { useTimePeriod } from "@/lib/providers/time-period-provider";

interface ProjectGapDataPoint {
  date: string;
  [projectId: string]: number | string; // Dynamic project IDs as keys with gap counts
}

interface ProjectInfo {
  id: string;
  name: string;
  color: string;
}

export function useProjectGapsTimeline() {
  const [timelineData, setTimelineData] = useState<ProjectGapDataPoint[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { range, period } = useTimePeriod();

  // Generate colors for projects
  const getProjectColor = (index: number) => {
    const colors = [
      "#ef4444", // red
      "#f97316", // orange
      "#eab308", // yellow
      "#22c55e", // green
      "#3b82f6", // blue
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#84cc16", // lime
      "#f59e0b", // amber
    ];
    return colors[index % colors.length];
  };

  const fetchProjectGapsTimeline = async () => {
    try {
      setLoading(true);
      setError(null);

      const allProjects = await getProjects();
      if (allProjects.length === 0) {
        setTimelineData([]);
        setProjects([]);
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
        setTimelineData([]);
        setProjects([]);
        return;
      }

      // Set up project info with colors
      const projectsWithColors: ProjectInfo[] = relevantProjects.map((project, index) => ({
        id: project.id,
        name: project.name,
        color: getProjectColor(index)
      }));
      setProjects(projectsWithColors);

      // Generate date intervals based on time period with Australian formatting
      const getDateIntervals = () => {
        const intervals = [];
        let current = new Date(startDate);

        switch (period) {
          case "current-month":
            // Weekly intervals for current month
            while (current <= endDate) {
              const intervalEnd = new Date(current);
              intervalEnd.setDate(intervalEnd.getDate() + 6);
              if (intervalEnd > endDate) intervalEnd.setTime(endDate.getTime());
              
              intervals.push({
                start: new Date(current),
                end: intervalEnd,
                label: current.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              });
              
              current.setDate(current.getDate() + 7);
            }
            break;

          case "next-3-months":
            // Bi-weekly intervals for 3 months
            while (current <= endDate) {
              const intervalEnd = new Date(current);
              intervalEnd.setDate(intervalEnd.getDate() + 13);
              if (intervalEnd > endDate) intervalEnd.setTime(endDate.getTime());
              
              intervals.push({
                start: new Date(current),
                end: intervalEnd,
                label: current.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              });
              
              current.setDate(current.getDate() + 14);
            }
            break;

          case "all-future":
            // Monthly intervals for up to 1 year
            while (current <= endDate && intervals.length < 12) {
              const intervalEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
              if (intervalEnd > endDate) intervalEnd.setTime(endDate.getTime());
              
              intervals.push({
                start: new Date(current),
                end: intervalEnd,
                label: current.toLocaleDateString('en-AU', { month: 'short' })
              });
              
              current.setMonth(current.getMonth() + 1);
              current.setDate(1);
            }
            break;
        }

        return intervals;
      };

      const intervals = getDateIntervals();
      const dataPoints: ProjectGapDataPoint[] = [];

      // Calculate gaps for each interval
      for (const interval of intervals) {
        const dataPoint: ProjectGapDataPoint = {
          date: interval.label
        };

        // Get gaps for each project in this interval
        for (const project of projectsWithColors) {
          try {
            const projectGaps = await getProjectGaps(project.id);
            
            // Filter gaps that overlap with this interval
            const intervalStart = interval.start;
            const intervalEnd = interval.end;
            
            let totalGaps = 0;
            for (const gap of projectGaps) {
              const gapStart = new Date(gap.start_date);
              const gapEnd = new Date(gap.end_date);
              
              // Check if gap overlaps with interval
              const overlaps = gapStart <= intervalEnd && gapEnd >= intervalStart;
              if (overlaps) {
                totalGaps += gap.gap_count;
              }
            }
            
            dataPoint[project.id] = totalGaps;
          } catch (error) {
            console.warn(`Failed to get gaps for project ${project.id}:`, error);
            dataPoint[project.id] = 0;
          }
        }

        dataPoints.push(dataPoint);
      }

      setTimelineData(dataPoints);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch project gaps timeline";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectGapsTimeline();
  }, [range.startDate, range.endDate, period]);

  const getTotalGapsAcrossProjects = () => {
    if (timelineData.length === 0 || projects.length === 0) return 0;
    
    return timelineData.reduce((sum, dataPoint) => {
      const periodSum = projects.reduce((projectSum, project) => {
        return projectSum + (dataPoint[project.id] as number || 0);
      }, 0);
      return sum + periodSum;
    }, 0);
  };

  const getWorstProject = () => {
    if (timelineData.length === 0 || projects.length === 0) return null;
    
    const projectTotals = projects.map(project => {
      const total = timelineData.reduce((sum, dataPoint) => {
        return sum + (dataPoint[project.id] as number || 0);
      }, 0);
      return { ...project, totalGaps: total };
    });

    return projectTotals.reduce((worst, current) => 
      current.totalGaps > worst.totalGaps ? current : worst
    );
  };

  return {
    timelineData,
    projects,
    totalGaps: getTotalGapsAcrossProjects(),
    worstProject: getWorstProject(),
    loading,
    error,
    refetch: fetchProjectGapsTimeline,
  };
}