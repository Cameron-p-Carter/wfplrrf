import type { Tables } from "@/types/supabase";
import type { TimelineConfig } from "@/lib/utils/timeline";

export interface RequirementWithAllocations {
  id: string;
  requirement: Tables<"project_requirements_detailed">;
  allocations: Tables<"project_allocations_detailed">[];
  positions: RequirementPosition[];
  children?: RequirementWithAllocations[];
}

export interface RequirementPosition {
  id: string;
  requirementId: string;
  positionIndex: number;
  roleTypeName: string;
  startDate: Date;
  endDate: Date;
  allocatedPerson?: {
    id: string;
    name: string;
    allocationPercentage: number;
    allocationId: string;
    allocationStartDate: Date;
    allocationEndDate: Date;
  };
  requirement: Tables<"project_requirements_detailed">;
}

export interface TimelineCallbacks {
  onConfigChange?: (config: TimelineConfig) => void;
  onAllocatePosition?: (position: RequirementPosition) => void;
  onEditPosition?: (position: RequirementPosition) => void;
  onDeleteOrphanedAllocation?: (allocationId: string) => void;
  onEditAllocation?: (allocation: Tables<"project_allocations_detailed">) => void;
  onDeleteAllocation?: (allocation: Tables<"project_allocations_detailed">) => void;
  onEditRequirement?: (requirement: Tables<"project_requirements_detailed">) => void;
  onDeleteRequirement?: (requirement: Tables<"project_requirements_detailed">) => void;
  onIgnoreRequirement?: (requirement: Tables<"project_requirements_detailed">) => void;
  onUnIgnoreRequirement?: (requirement: Tables<"project_requirements_detailed">) => void;
}

export interface TimelineProps {
  title: string;
  groupedRequirements: (Tables<"project_requirements_detailed"> & { children?: Tables<"project_requirements_detailed">[] })[];
  allocations: Tables<"project_allocations_detailed">[];
  config: TimelineConfig;
  className?: string;
  projectStartDate?: Date;
  projectEndDate?: Date;
}

export interface AllocationPosition {
  left: number;
  width: number;
}