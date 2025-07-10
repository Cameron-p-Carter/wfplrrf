"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  getProjects,
  getPeople,
  getRoleTypes,
  getAllAllocations,
  getProjectGaps,
  getOverAllocatedPeople,
  getPendingLeave
} from "@/lib/supabase";
import { useResourceAnalytics } from "./use-resource-analytics";
import type { Tables } from "@/types/supabase";

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  upcomingProjects: number;
  completedProjects: number;
  totalPeople: number;
  totalRoleTypes: number;
  averageUtilization: number;
  overAllocatedCount: number;
  totalResourceGaps: number;
  pendingLeaveRequests: number;
}

interface ProjectStatusSummary {
  project: Tables<"projects">;
  status: "active" | "upcoming" | "completed";
  hasGaps: boolean;
  hasOverAllocations: boolean;
  statusLabel: string;
  statusVariant: "default" | "secondary" | "outline" | "destructive";
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    upcomingProjects: 0,
    completedProjects: 0,
    totalPeople: 0,
    totalRoleTypes: 0,
    averageUtilization: 0,
    overAllocatedCount: 0,
    totalResourceGaps: 0,
    pendingLeaveRequests: 0,
  });
  
  const [projectSummaries, setProjectSummaries] = useState<ProjectStatusSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { utilizationStats, overAllocatedPeople } = useResourceAnalytics();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projects, people, roleTypes, pendingLeave] = await Promise.all([
        getProjects(),
        getPeople(),
        getRoleTypes(),
        getPendingLeave()
      ]);

      const now = new Date();
      
      // Calculate project statistics
      const activeProjects = projects.filter(project => {
        const startDate = new Date(project.start_date);
        const endDate = new Date(project.end_date);
        return now >= startDate && now <= endDate;
      });

      const upcomingProjects = projects.filter(project => {
        const startDate = new Date(project.start_date);
        return startDate > now;
      });

      const completedProjects = projects.filter(project => {
        const endDate = new Date(project.end_date);
        return endDate < now;
      });

      // Calculate resource gaps across all projects
      let totalGaps = 0;
      const projectSummariesData: ProjectStatusSummary[] = [];

      for (const project of projects) {
        try {
          const gaps = await getProjectGaps(project.id);
          const hasGaps = gaps.length > 0;
          totalGaps += gaps.length;

          const startDate = new Date(project.start_date);
          const endDate = new Date(project.end_date);
          
          let status: "active" | "upcoming" | "completed";
          let statusLabel: string;
          let statusVariant: "default" | "secondary" | "outline" | "destructive";

          if (now < startDate) {
            status = "upcoming";
            statusLabel = "Upcoming";
            statusVariant = "secondary";
          } else if (now > endDate) {
            status = "completed";
            statusLabel = "Completed";
            statusVariant = "outline";
          } else {
            status = "active";
            if (hasGaps) {
              statusLabel = "Resource Gaps";
              statusVariant = "destructive";
            } else {
              statusLabel = "On Track";
              statusVariant = "default";
            }
          }

          projectSummariesData.push({
            project,
            status,
            hasGaps,
            hasOverAllocations: false, // We'll update this if needed
            statusLabel,
            statusVariant,
          });
        } catch (error) {
          console.warn(`Failed to get gaps for project ${project.id}:`, error);
        }
      }

      // Update stats
      setStats({
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        upcomingProjects: upcomingProjects.length,
        completedProjects: completedProjects.length,
        totalPeople: people.length,
        totalRoleTypes: roleTypes.length,
        averageUtilization: utilizationStats.averageUtilization,
        overAllocatedCount: utilizationStats.overAllocated,
        totalResourceGaps: totalGaps,
        pendingLeaveRequests: pendingLeave.length,
      });

      setProjectSummaries(projectSummariesData);

      // Generate recent activity (mock data for now)
      const activity = [
        ...projects.slice(0, 3).map(project => ({
          type: 'project',
          message: `Project "${project.name}" ${getProjectStatus(project, now)}`,
          timestamp: project.updated_at || project.created_at,
          href: `/dashboard/projects/${project.id}`,
        })),
        ...people.slice(0, 2).map(person => ({
          type: 'person',
          message: `${person.name} added to team`,
          timestamp: person.updated_at || person.created_at,
          href: `/dashboard/people/${person.id}`,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setRecentActivity(activity);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch dashboard data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [utilizationStats.averageUtilization, utilizationStats.overAllocated]);

  const getProjectStatus = (project: Tables<"projects">, now: Date) => {
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (now < startDate) {
      return "starting soon";
    } else if (now > endDate) {
      return "completed";
    } else {
      return "is active";
    }
  };

  const getTopUtilizedPeople = () => {
    return utilizationStats.total > 0 ? 
      overAllocatedPeople.slice(0, 5) : [];
  };

  const getUpcomingDeadlines = (projects: Tables<"projects">[]) => {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    return projects
      .filter((project: Tables<"projects">) => {
        const endDate = new Date(project.end_date);
        return endDate > now && endDate <= twoWeeksFromNow;
      })
      .sort((a: Tables<"projects">, b: Tables<"projects">) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
      .slice(0, 5);
  };

  return {
    stats,
    projectSummaries,
    recentActivity,
    topUtilizedPeople: getTopUtilizedPeople(),
    upcomingDeadlines: getUpcomingDeadlines([]),
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
