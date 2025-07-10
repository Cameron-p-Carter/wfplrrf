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
import { formatDate } from "@/lib/utils/date";

export default function DashboardPage() {
  const { roleTypes, loading: roleTypesLoading } = useRoleTypes();
  const { people, loading: peopleLoading } = usePeople();
  const { projects, loading: projectsLoading } = useProjects();
  const { overAllocatedPeople, peopleUtilization, utilizationStats, loading: analyticsLoading } = useResourceAnalytics();

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your workforce planning
        </p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        {/* People Utilization Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Utilization</CardTitle>
                <CardDescription>Current capacity usage</CardDescription>
              </div>
              <Link href="/dashboard/people">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : peopleUtilization.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No utilization data</p>
                <Link href="/dashboard/people">
                  <Button size="sm">Add People</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Utilization</span>
                    <span className="font-medium">{utilizationStats.averageUtilization}%</span>
                  </div>
                  <Progress value={utilizationStats.averageUtilization} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  {peopleUtilization
                    .sort((a, b) => b.utilization_percentage - a.utilization_percentage)
                    .slice(0, 4)
                    .map((person, index) => (
                      <Link key={index} href={`/dashboard/people/${person.person_id}`}>
                        <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer">
                          <span className="text-sm truncate">{person.person_name}</span>
                          <Badge variant={
                            person.utilization_percentage > 100 ? "destructive" :
                            person.utilization_percentage >= 80 ? "default" : "secondary"
                          }>
                            {person.utilization_percentage}%
                          </Badge>
                        </div>
                      </Link>
                    ))}
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
