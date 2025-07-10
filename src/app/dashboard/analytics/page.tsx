"use client";

import { AlertTriangle, Users, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useResourceAnalytics } from "@/lib/hooks/use-resource-analytics";

export default function AnalyticsPage() {
  const { overAllocatedPeople, peopleUtilization, utilizationStats, loading } = useResourceAnalytics();

  const getUtilizationBadge = (utilization: number) => {
    if (utilization > 100) {
      return <Badge variant="destructive">{utilization}%</Badge>;
    } else if (utilization >= 80) {
      return <Badge variant="default">{utilization}%</Badge>;
    } else if (utilization >= 50) {
      return <Badge variant="secondary">{utilization}%</Badge>;
    } else {
      return <Badge variant="outline">{utilization}%</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "over-allocated":
        return <Badge variant="destructive">Over-allocated</Badge>;
      case "fully-utilized":
        return <Badge variant="default">Fully Utilized</Badge>;
      case "partially-utilized":
        return <Badge variant="secondary">Partially Utilized</Badge>;
      case "under-utilized":
        return <Badge variant="outline">Under-utilized</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Analytics</h1>
        <p className="text-muted-foreground">
          Monitor resource utilization and identify allocation issues
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : utilizationStats.total}
            </div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : `${utilizationStats.averageUtilization}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over-allocated</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? <Skeleton className="h-8 w-16" /> : utilizationStats.overAllocated}
            </div>
            <p className="text-xs text-muted-foreground">
              People over 100% capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under-utilized</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : utilizationStats.underUtilized}
            </div>
            <p className="text-xs text-muted-foreground">
              People under 50% capacity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Utilization Distribution</CardTitle>
          <CardDescription>
            Current utilization breakdown across the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Over-allocated (&gt;100%)</span>
                <span className="text-sm text-muted-foreground">
                  {utilizationStats.overAllocated} people
                </span>
              </div>
              <Progress 
                value={(utilizationStats.overAllocated / utilizationStats.total) * 100} 
                className="h-2"
              />
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fully utilized (80-100%)</span>
                <span className="text-sm text-muted-foreground">
                  {utilizationStats.fullyUtilized} people
                </span>
              </div>
              <Progress 
                value={(utilizationStats.fullyUtilized / utilizationStats.total) * 100} 
                className="h-2"
              />
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Under-utilized (&lt;50%)</span>
                <span className="text-sm text-muted-foreground">
                  {utilizationStats.underUtilized} people
                </span>
              </div>
              <Progress 
                value={(utilizationStats.underUtilized / utilizationStats.total) * 100} 
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Over-allocated People */}
      {overAllocatedPeople.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Over-allocated People</span>
            </CardTitle>
            <CardDescription>
              People with total allocations exceeding 100% capacity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Total Allocation</TableHead>
                  <TableHead>Conflicting Projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overAllocatedPeople.map((person, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{person.person_name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{person.total_allocation}%</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {person.conflicting_allocations.map((allocation: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            {allocation.project_name} ({allocation.allocation_percentage}%)
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* People Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>People Utilization</CardTitle>
          <CardDescription>
            Current utilization for all team members (current month)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[120px]" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Role Type</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {peopleUtilization.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No utilization data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  peopleUtilization
                    .sort((a, b) => b.utilization_percentage - a.utilization_percentage)
                    .map((person, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{person.person_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{person.role_type_name}</Badge>
                        </TableCell>
                        <TableCell>
                          {getUtilizationBadge(person.utilization_percentage)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(person.status)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
