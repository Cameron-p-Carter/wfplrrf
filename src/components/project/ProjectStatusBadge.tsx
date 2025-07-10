import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/supabase";

interface ProjectStatusBadgeProps {
  project: Tables<"projects">;
  className?: string;
}

export function ProjectStatusBadge({ project, className }: ProjectStatusBadgeProps) {
  const getProjectStatus = (project: Tables<"projects">) => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (now < startDate) {
      return { label: "Not Started", variant: "secondary" as const };
    } else if (now > endDate) {
      return { label: "Completed", variant: "outline" as const };
    } else {
      return { label: "In Progress", variant: "default" as const };
    }
  };

  const status = getProjectStatus(project);

  return (
    <Badge variant={status.variant} className={className}>
      {status.label}
    </Badge>
  );
}