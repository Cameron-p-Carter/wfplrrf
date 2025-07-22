"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Briefcase, 
  UserCheck, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  BarChart3,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle
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

export default function DashboardPage() {
  const { roleTypes, loading: roleTypesLoading } = useRoleTypes();
  const { people, loading: peopleLoading } = usePeople();
  const { projects, loading: projectsLoading } = useProjects();
  const { overAllocatedPeople, peopleUtilization, utilizationStats, loading: analyticsLoading } = useResourceAnalytics();
  const { gapsByRole, projectsWithGaps, totalGaps, criticalGaps, loading: gapsLoading } = useCurrentPeriodGaps();
  const { timelineData, currentAverage, trend, loading: timelineLoading } = useUtilizationTimeline();
  const { timelineData: gapsTimelineData, projects: gapsProjects, totalGaps: timelineTotalGaps, worstProject, loading: gapsTimelineLoading } = useProjectGapsTimeline();
  const { period, range } = useTimePeriod();

  const activeProjects = projects.filter(project => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    return now >= startDate && now <= endDate;
  });

  const upcomingProjects = projects.filter(project => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    return startDate > now;
  });

  const completedProjects = projects.filter(project => {
    const now = new Date();
    const endDate = new Date(project.end_date);
    return endDate < now;
  });

  const getProjectStatus = (project: any) => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (now < startDate) {
      return { label: "Upcoming", variant: "secondary" as const, icon: Clock };
    } else if (now > endDate) {
      return { label: "Completed", variant: "outline" as const, icon: CheckCircle };
    } else {
      return { label: "Active", variant: "default" as const, icon: Briefcase };
    }
  };

  const stats = [
    {
      title: "Active Projects",
      value: projectsLoading ? "..." : activeProjects.length.toString(),
      description: "Currently running projects",
      icon: Briefcase,
      loading: projectsLoading,
      href: "/dashboard/projects",
    },
    {
      title: "Total People",
      value: peopleLoading ? "..." : people.length.toString(),
      description: "People in organization",
      icon: Users,
      loading: peopleLoading,
      href: "/dashboard/people",
    },
    {
      title: "Average Utilization",
      value: analyticsLoading ? "..." : `${utilizationStats.averageUtilization}%`,
      description: "Overall resource utilization",
      icon: TrendingUp,
      loading: analyticsLoading,
      href: "/dashboard/analytics",
    },
    {
      title: "Over-allocated",
      value: analyticsLoading ? "..." : utilizationStats.overAllocated.toString(),
      description: "People over 100% capacity",
      icon: AlertTriangle,
      loading: analyticsLoading,
      href: "/dashboard/analytics",
      alert: utilizationStats.overAllocated > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your workforce planning
          </p>
        </div>
        <TimePeriodSelector />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.alert ? 'text-destructive' : ''}`}>
                  {stat.loading ? <Skeleton className="h-8 w-12" /> : stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alerts Section */}
      {overAllocatedPeople.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Resource Conflicts Detected</span>
            </CardTitle>
            <CardDescription>
              {overAllocatedPeople.length} people are over-allocated and need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overAllocatedPeople.slice(0, 3).map((person, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-destructive/10 rounded">
                  <span className="font-medium">{person.person_name}</span>
                  <Badge variant="destructive">{person.total_allocation}% allocated</Badge>
                </div>
              ))}
              {overAllocatedPeople.length > 3 && (
                <Link href="/dashboard/analytics">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Conflicts <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Under-utilized People Section */}
      {utilizationStats.underUtilized > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-700">
              <Users className="h-5 w-5" />
              <span>Under-utilized Resources</span>
            </CardTitle>
            <CardDescription>
              {utilizationStats.underUtilized} people have low utilization in {range.description.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {peopleUtilization
                .filter(person => person.status === 'under-utilized')
                .slice(0, 3)
                .map((person, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-yellow-100/50 rounded">
                    <div>
                      <span className="font-medium">{person.person_name}</span>
                      <div className="text-xs text-muted-foreground">{person.role_type_name}</div>
                    </div>
                    <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                      {person.utilization_percentage}% allocated
                    </Badge>
                  </div>
                ))}
              {utilizationStats.underUtilized > 3 && (
                <Link href="/dashboard/analytics">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Under-utilized <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Period Gaps Section */}
      {totalGaps > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Resource Gaps</span>
            </CardTitle>
            <CardDescription>
              {totalGaps} unfilled requirements in {range.description.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gapsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {projectsWithGaps
                  .sort((a, b) => b.gap_count - a.gap_count) // Sort by gap count descending
                  .slice(0, 5) // Show top 5 projects
                  .map((project) => (
                    <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                      <div className="flex items-center justify-between p-2 bg-orange-100/50 rounded hover:bg-orange-100 cursor-pointer transition-colors">
                        <div>
                          <span className="font-medium">{project.name}</span>
                          <div className="text-xs text-muted-foreground">
                            Click to view project dashboard
                          </div>
                        </div>
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          {project.gap_count} gap{project.gap_count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                {projectsWithGaps.length > 5 && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      +{projectsWithGaps.length - 5} more projects with gaps
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Team Utilization Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Team Utilization</CardTitle>
            <CardDescription>Average utilization over time</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineLoading || peopleUtilization.length === 0 ? (
              <UtilizationChart data={[]} loading={timelineLoading} height={180} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {range.description}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Average: <span className="font-medium text-foreground">{currentAverage}%</span>
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      trend === 'increasing' ? 'bg-green-100 text-green-700' :
                      trend === 'decreasing' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {trend === 'increasing' ? '↗ Increasing' :
                       trend === 'decreasing' ? '↘ Decreasing' :
                       '→ Stable'}
                    </span>
                  </div>
                </div>
                <UtilizationChart data={timelineData} loading={timelineLoading} height={180} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Gaps Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Project Gaps Timeline</CardTitle>
            <CardDescription>Resource gaps by project over time</CardDescription>
          </CardHeader>
          <CardContent>
            {gapsTimelineLoading ? (
              <ProjectGapsChart data={[]} projects={[]} loading={gapsTimelineLoading} height={180} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {range.description}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Total: <span className="font-medium text-foreground">{timelineTotalGaps} gaps</span>
                    </span>
                    {worstProject && worstProject.totalGaps > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                        Worst: {worstProject.name} ({worstProject.totalGaps})
                      </span>
                    )}
                  </div>
                </div>
                <ProjectGapsChart 
                  data={gapsTimelineData} 
                  projects={gapsProjects} 
                  loading={gapsTimelineLoading} 
                  height={180} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Status and Quick Actions Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Project Status Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Project Status</CardTitle>
                <CardDescription>Current project overview</CardDescription>
              </div>
              <Link href="/dashboard/projects">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No projects yet</p>
                <Link href="/dashboard/projects">
                  <Button size="sm">Create First Project</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{activeProjects.length}</div>
                    <div className="text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{upcomingProjects.length}</div>
                    <div className="text-muted-foreground">Upcoming</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600">{completedProjects.length}</div>
                    <div className="text-muted-foreground">Completed</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {projects.slice(0, 4).map((project) => {
                    const status = getProjectStatus(project);
                    return (
                      <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                        <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                          <status.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm flex-1 truncate">{project.name}</span>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/dashboard/projects">
                <Button variant="outline" className="w-full justify-start">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Create New Project
                </Button>
              </Link>
              <Link href="/dashboard/people">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Add Team Member
                </Button>
              </Link>
              <Link href="/dashboard/role-types">
                <Button variant="outline" className="w-full justify-start">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Manage Role Types
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              </Link>
              <Link href="/dashboard/leave">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Leave
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Types Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Composition</CardTitle>
              <CardDescription>People distribution by role type</CardDescription>
            </div>
            <Link href="/dashboard/role-types">
              <Button variant="ghost" size="sm">
                Manage Roles <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {peopleLoading || roleTypesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-8 w-8 mx-auto mb-2" />
                  <Skeleton className="h-4 w-20 mx-auto mb-1" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          ) : roleTypes.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No role types defined yet</p>
              <Link href="/dashboard/role-types">
                <Button>Create Role Types</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {roleTypes.map((roleType) => {
                const count = people.filter(person => person.role_type_id === roleType.id).length;
                const percentage = people.length > 0 ? Math.round((count / people.length) * 100) : 0;
                
                return (
                  <div key={roleType.id} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{count}</div>
                    <div className="text-sm font-medium">{roleType.name}</div>
                    <div className="text-xs text-muted-foreground">{percentage}% of team</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
