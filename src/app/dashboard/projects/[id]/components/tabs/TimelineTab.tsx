import { ProjectTimeline } from "@/components/ui/project-timeline";
import type { Tables } from "@/types/supabase";
import type { TimelineConfig } from "@/lib/utils/timeline";

interface TimelineTabProps {
  groupedRequirements: (Tables<"project_requirements_detailed"> & { children?: Tables<"project_requirements_detailed">[] })[];
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
  onIgnoreRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onUnIgnoreRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
}

export function TimelineTab({
  groupedRequirements,
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
  onIgnoreRequirement,
  onUnIgnoreRequirement,
}: TimelineTabProps) {
  return (
    <ProjectTimeline
      title="Project Resource Timeline"
      groupedRequirements={groupedRequirements}
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
      onIgnoreRequirement={onIgnoreRequirement}
      onUnIgnoreRequirement={onUnIgnoreRequirement}
      projectStartDate={project ? new Date(project.start_date) : undefined}
      projectEndDate={project ? new Date(project.end_date) : undefined}
    />
  );
}