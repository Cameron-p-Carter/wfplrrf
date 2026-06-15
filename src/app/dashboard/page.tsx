"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  FileText,
  BarChart3,
} from "lucide-react";
import { useRoleTypes } from "@/lib/hooks/use-role-types";
import { usePeople } from "@/lib/hooks/use-people";
import { useProjects } from "@/lib/hooks/use-projects";
import { useResourceAnalytics } from "@/lib/hooks/use-resource-analytics";
import { useCurrentPeriodGaps } from "@/lib/hooks/use-current-period-gaps";
import { useUtilizationTimeline } from "@/lib/hooks/use-utilization-timeline";
import { useProjectGapsTimeline } from "@/lib/hooks/use-project-gaps-timeline";
import { TimePeriodSelector } from "@/components/ui/time-period-selector";
import { UtilizationChart } from "@/components/ui/utilization-chart";
import { ProjectGapsChart } from "@/components/ui/project-gaps-chart";
import { useTimePeriod } from "@/lib/providers/time-period-provider";
import { formatDate } from "@/lib/utils/date";

function getProjectStatus(project: { start_date: string; end_date: string }) {
  const now = new Date();
  const start = new Date(project.start_date);
  const end = new Date(project.end_date);
  if (now < start) return { label: "Upcoming", variant: "secondary" as const, icon: Clock };
  if (now > end) return { label: "Completed", variant: "outline" as const, icon: CheckCircle };
  return { label: "Active", variant: "default" as const, icon: Briefcase };
}

export default function DashboardPage() {
  const { roleTypes, loading: roleTypesLoading } = useRoleTypes();
  const { people, loading: peopleLoading } = usePeople();
  const { projects, loading: projectsLoading } = useProjects();
  const { overAllocatedPeople, peopleUtilization, utilizationStats, loading: analyticsLoading } = useResourceAnalytics();
  const { projectsWithGaps, totalGaps, loading: gapsLoading } = useCurrentPeriodGaps();
  const { timelineData, currentAverage, trend, loading: timelineLoading } = useUtilizationTimeline();
  const { timelineData: gapsTimelineData, projects: gapsProjects, totalGaps: timelineTotalGaps, worstProject, loading: gapsTimelineLoading } = useProjectGapsTimeline();
  const { range } = useTimePeriod();

  const now = new Date();
  const activeProjects = projects.filter((p) => new Date(p.start_date) <= now && now <= new Date(p.end_date));
  const upcomingProjects = projects.filter((p) => new Date(p.start_date) > now);
  const completedProjects = projects.filter((p) => new Date(p.end_date) < now);

  const issueCount =
    utilizationStats.overAllocated + utilizationStats.underUtilized + totalGaps;

  const stats = [
    {
      title: "Active Projects",
      value: projectsLoading ? "…" : activeProjects.length.toString(),
      description: `${upcomingProjects.length} upcoming`,
      icon: Briefcase,
      href: "/dashboard/projects",
      loading: projectsLoading,
    },
    {
      title: "Total People",
      value: peopleLoading ? "…" : people.length.toString(),
      description: `across ${roleTypes.length} role types`,
      icon: Users,
      href: "/dashboard/people",
      loading: peopleLoading,
    },
    {
      title: "Avg Utilisation",
      value: analyticsLoading ? "…" : `${utilizationStats.averageUtilization}%`,
      description: range.description,
      icon: TrendingUp,
      href: "/dashboard/analytics",
      loading: analyticsLoading,
      alert: utilizationStats.averageUtilization > 100,
    },
    {
      title: "Issues",
      value: analyticsLoading || gapsLoading ? "…" : issueCount.toString(),
      description: "over-allocated, gaps, or low",
      icon: AlertTriangle,
      href: "/dashboard/analytics",
      loading: analyticsLoading || gapsLoading,
      alert: issueCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Workforce planning overview</p>
        </div>
        <TimePeriodSelector />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon
                  className={`h-4 w-4 ${stat.alert ? "text-destructive" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.alert ? "text-destructive" : ""}`}>
                  {stat.loading ? <Skeleton className="h-8 w-12" /> : stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main content: charts (2/3) + issues panel (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Charts column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Utilisation chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Team Utilisation</CardTitle>
                  <CardDescription>Average allocation over {range.description.toLowerCase()}</CardDescription>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Avg: <span className="font-semibold text-foreground">{currentAverage}%</span>
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      trend === "increasing"
                        ? "bg-emerald-100 text-emerald-700"
                        : trend === "decreasing"
                        ? "bg-red-100 text-red-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {trend === "increasing" ? "↗ Increasing" : trend === "decreasing" ? "↘ Decreasing" : "→ Stable"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UtilizationChart data={timelineData} loading={timelineLoading} height={200} />
            </CardContent>
          </Card>

          {/* Gaps chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Project Gaps Timeline</CardTitle>
                  <CardDescription>Unfilled requirements over {range.description.toLowerCase()}</CardDescription>
                </div>
                {worstProject && worstProject.totalGaps > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Worst: {worstProject.name} ({worstProject.totalGaps})
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProjectGapsChart
                data={gapsTimelineData}
                projects={gapsProjects}
                loading={gapsTimelineLoading}
                height={200}
              />
            </CardContent>
          </Card>

          {/* Projects list */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Projects</CardTitle>
                  <CardDescription>
                    {activeProjects.length} active · {upcomingProjects.length} upcoming · {completedProjects.length} completed
                  </CardDescription>
                </div>
                <Link href="/dashboard/projects">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : projects.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
                  <Link href="/dashboard/projects">
                    <Button size="sm">Create First Project</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {projects.slice(0, 5).map((project) => {
                    const status = getProjectStatus(project);
                    const gapCount = projectsWithGaps.find((p) => p.id === project.id)?.gap_count ?? 0;
                    return (
                      <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                          <status.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm flex-1 truncate">{project.name}</span>
                          {gapCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3" /> {gapCount}
                            </span>
                          )}
                          <Badge variant={status.variant} className="text-xs flex-shrink-0">
                            {status.label}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                  {projects.length > 5 && (
                    <Link href="/dashboard/projects">
                      <div className="text-xs text-muted-foreground text-center py-2 hover:text-foreground transition-colors">
                        +{projects.length - 5} more projects
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Issues + quick actions column */}
        <div className="space-y-4">
          {/* Issues panel */}
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Issues
                  {issueCount > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {issueCount}
                    </Badge>
                  )}
                </CardTitle>
                <Link href="/dashboard/analytics">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Analytics <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsLoading || gapsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
                </div>
              ) : issueCount === 0 ? (
                <div className="py-6 text-center">
                  <div className="text-2xl mb-1">✓</div>
                  <p className="text-sm font-medium text-emerald-600">All good</p>
                  <p className="text-xs text-muted-foreground mt-1">No resource issues in {range.description.toLowerCase()}</p>
                </div>
              ) : (
                <>
                  {/* Over-allocated */}
                  {utilizationStats.overAllocated > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-destructive mb-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {utilizationStats.overAllocated} over-allocated
                      </div>
                      <div className="space-y-1">
                        {overAllocatedPeople.slice(0, 3).map((person, i) => (
                          <div key={i} className="flex items-center justify-between text-sm px-2 py-1 bg-destructive/5 rounded">
                            <span className="truncate">{person.person_name}</span>
                            <span className="text-xs font-medium text-destructive ml-2 flex-shrink-0">
                              {person.total_allocation}%
                            </span>
                          </div>
                        ))}
                        {utilizationStats.overAllocated > 3 && (
                          <Link href="/dashboard/people?filter=over-utilized">
                            <p className="text-xs text-muted-foreground text-center py-0.5 hover:text-foreground">
                              +{utilizationStats.overAllocated - 3} more
                            </p>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Under-utilised */}
                  {utilizationStats.underUtilized > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 mb-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {utilizationStats.underUtilized} under-utilised
                      </div>
                      <div className="space-y-1">
                        {peopleUtilization
                          .filter((p) => p.status === "under-utilized")
                          .slice(0, 3)
                          .map((person, i) => (
                            <div key={i} className="flex items-center justify-between text-sm px-2 py-1 bg-yellow-50 rounded">
                              <span className="truncate">{person.person_name}</span>
                              <span className="text-xs font-medium text-yellow-700 ml-2 flex-shrink-0">
                                {person.utilization_percentage}%
                              </span>
                            </div>
                          ))}
                        {utilizationStats.underUtilized > 3 && (
                          <p className="text-xs text-muted-foreground text-center py-0.5">
                            +{utilizationStats.underUtilized - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gaps */}
                  {totalGaps > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 mb-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {totalGaps} resource gaps
                      </div>
                      <div className="space-y-1">
                        {projectsWithGaps
                          .sort((a, b) => b.gap_count - a.gap_count)
                          .slice(0, 4)
                          .map((project) => (
                            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                              <div className="flex items-center justify-between text-sm px-2 py-1 bg-amber-50 rounded hover:bg-amber-100 transition-colors">
                                <span className="truncate">{project.name}</span>
                                <span className="text-xs font-medium text-amber-700 ml-2 flex-shrink-0">
                                  {project.gap_count} gap{project.gap_count !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </Link>
                          ))}
                        {projectsWithGaps.length > 4 && (
                          <p className="text-xs text-muted-foreground text-center py-0.5">
                            +{projectsWithGaps.length - 4} more projects
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Link href="/dashboard/projects">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Briefcase className="mr-2 h-3.5 w-3.5" /> New Project
                </Button>
              </Link>
              <Link href="/dashboard/people">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="mr-2 h-3.5 w-3.5" /> Add Team Member
                </Button>
              </Link>
              <Link href="/dashboard/leave">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="mr-2 h-3.5 w-3.5" /> Manage Leave
                </Button>
              </Link>
              <Link href="/dashboard/contracts">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="mr-2 h-3.5 w-3.5" /> Contracts
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-3.5 w-3.5" /> Resource Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Team composition */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Team Composition</CardTitle>
                <Link href="/dashboard/role-types">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Manage <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {peopleLoading || roleTypesLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                </div>
              ) : roleTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No role types yet</p>
              ) : (
                <div className="space-y-2">
                  {roleTypes
                    .map((rt) => ({
                      ...rt,
                      count: people.filter((p) => p.role_type_id === rt.id).length,
                    }))
                    .sort((a, b) => b.count - a.count)
                    .map((rt) => (
                      <div key={rt.id} className="flex items-center justify-between text-sm">
                        <span className="truncate text-muted-foreground">{rt.name}</span>
                        <span className="font-medium ml-2 flex-shrink-0">{rt.count}</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
