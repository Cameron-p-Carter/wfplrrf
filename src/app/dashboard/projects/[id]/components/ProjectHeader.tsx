import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStatusBadge } from "@/components/project/ProjectStatusBadge";
import { formatDate } from "@/lib/utils/date";
import type { Tables } from "@/types/supabase";

interface ProjectHeaderProps {
  project: Tables<"projects"> | null;
  loading: boolean;
  onBack: () => void;
}

export function ProjectHeader({ project, loading, onBack }: ProjectHeaderProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Project Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-600">
            {formatDate(project.start_date)} - {formatDate(project.end_date)}
          </p>
        </div>
      </div>
      <ProjectStatusBadge project={project} />
    </div>
  );
}