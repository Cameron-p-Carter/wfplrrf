import { ProjectTimeline } from "@/components/ui/project-timeline";
import type { Tables } from "@/types/supabase";
import type { TimelineConfig } from "@/lib/utils/timeline";

interface TimelineTabProps {
  requirements: Tables<"project_requirements_detailed">[];
  allocations: Tables<"project_allocations_detailed">[];
  timelineConfig: TimelineConfig;
  project: Tables<"projects"> | null;
  onConfigChange: (config: TimelineConfig) => void;
  onAllocatePosition: (position: any) => void;
  onEditPosition: (position: any) => void;
  onDeleteOrphanedAllocation: (allocationId: string) => void;
  onEditAllocation: (allocation: Tables<"project_allocations_detailed">) => void;
  onDeleteAllocation: (allocationId: string) => void;
  onEditRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onDeleteRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
}

export function TimelineTab({
  requirements,
  allocations,
  timelineConfig,
  project,
  onConfigChange,
  onAllocatePosition,
  onEditPosition,
  onDeleteOrphanedAllocation,
  onEditAllocation,
  onDeleteAllocation,
  onEditRequirement,
  onDeleteRequirement,
}: TimelineTabProps) {
  return (
    <ProjectTimeline
      title="Project Resource Timeline"
      requirements={requirements}
      allocations={allocations}
      config={timelineConfig}
      onConfigChange={onConfigChange}
      onAllocatePosition={onAllocatePosition}
      onEditPosition={onEditPosition}
      onDeleteOrphanedAllocation={onDeleteOrphanedAllocation}
      onEditAllocation={onEditAllocation}
      onDeleteAllocation={onDeleteAllocation}
      onEditRequirement={onEditRequirement}
      onDeleteRequirement={onDeleteRequirement}
      projectStartDate={project ? new Date(project.start_date) : undefined}
      projectEndDate={project ? new Date(project.end_date) : undefined}
    />
  );
}