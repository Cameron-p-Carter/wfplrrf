import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Briefcase, Calendar, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

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

interface ProjectSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personName: string;
  personRoleType: string;
  suggestions: ProjectSuggestion[];
  loading?: boolean;
}

export function ProjectSuggestionsDialog({
  open,
  onOpenChange,
  personName,
  personRoleType,
  suggestions,
  loading = false
}: ProjectSuggestionsDialogProps) {
  const router = useRouter();

  const handleProjectClick = (projectId: string) => {
    onOpenChange(false);
    router.push(`/dashboard/projects/${projectId}`);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    const end = new Date(endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    return `${start} - ${end}`;
  };

  const getProjectStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return { label: "Upcoming", variant: "secondary" as const, icon: Calendar };
    } else if (now > end) {
      return { label: "Completed", variant: "outline" as const, icon: Briefcase };
    } else {
      return { label: "Active", variant: "default" as const, icon: Briefcase };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Project Suggestions for {personName}
          </DialogTitle>
          <DialogDescription>
            Projects with {personRoleType} role gaps that match this person's skills
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <Card className="border-muted">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Matching Projects</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  There are currently no projects with {personRoleType} role gaps that match this person's skills.
                </p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((project) => {
              const status = getProjectStatus(project.start_date, project.end_date);
              const StatusIcon = status.icon;
              
              return (
                <Card key={project.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleProjectClick(project.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        {project.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span>{formatDateRange(project.start_date, project.end_date)}</span>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        {project.gap_count} gap{project.gap_count !== 1 ? 's' : ''}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Matching Role Gaps:</h4>
                      <div className="space-y-1">
                        {project.matching_gaps.map((gap, index) => (
                          <div key={index} className="flex items-center justify-between text-sm p-2 bg-green-50/50 rounded border border-green-200">
                            <div>
                              <span className="font-medium text-green-700">{gap.role_type_name}</span>
                              <div className="text-xs text-muted-foreground">
                                {formatDateRange(gap.start_date, gap.end_date)}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-green-700 bg-green-100">
                              {gap.gap_count} needed
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}