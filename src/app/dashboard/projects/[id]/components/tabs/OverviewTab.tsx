import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStatusBadge } from "@/components/project/ProjectStatusBadge";
import { formatDate } from "@/lib/utils/date";
import type { Tables } from "@/types/supabase";

interface Gap {
  role_type_name: string;
  required_count: number;
  allocated_count: number;
  gap_count: number;
  start_date: string;
  end_date: string;
}

interface OverviewTabProps {
  project: Tables<"projects">;
  requirements: Tables<"project_requirements_detailed">[];
  allocations: Tables<"project_allocations_detailed">[];
  gaps: Gap[];
  requirementsLoading: boolean;
}

export function OverviewTab({
  project,
  requirements,
  allocations,
  gaps,
  requirementsLoading,
}: OverviewTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-sm">{project.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Start Date</label>
            <p className="text-sm">{formatDate(project.start_date)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">End Date</label>
            <p className="text-sm">{formatDate(project.end_date)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="mt-1">
              <ProjectStatusBadge project={project} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resource Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {requirementsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : !requirements || requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resource requirements defined yet.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">{requirements.length}</span> resource requirements
              </p>
              <p className="text-sm">
                <span className="font-medium">
                  {requirements.reduce((sum, req) => sum + (req.required_count || 0), 0)}
                </span> total people needed
              </p>
              <p className="text-sm">
                <span className="font-medium">
                  {new Set(requirements.map(req => req.role_type_id)).size}
                </span> different role types
              </p>
              <p className="text-sm">
                <span className="font-medium">{allocations ? allocations.length : 0}</span> current allocations
              </p>
              {gaps && gaps.length > 0 && (
                <p className="text-sm text-destructive">
                  <span className="font-medium">{gaps.length}</span> resource gaps
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}