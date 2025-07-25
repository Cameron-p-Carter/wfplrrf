import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OverviewTab } from "./tabs/OverviewTab";
import { ResourcesTab } from "./tabs/ResourcesTab";
import { TimelineTab } from "./tabs/TimelineTab";
import type { Tables } from "@/types/supabase";
import type { TimelineConfig } from "@/lib/utils/timeline";

interface Gap {
  role_type_name: string;
  required_count: number;
  allocated_count: number;
  gap_count: number;
  start_date: string;
  end_date: string;
}

interface ProjectTabsProps {
  project: Tables<"projects">;
  requirements: Tables<"project_requirements_detailed">[];
  groupedRequirements: (Tables<"project_requirements_detailed"> & { children?: Tables<"project_requirements_detailed">[] })[];
  allocations: Tables<"project_allocations_detailed">[];
  gaps: Gap[];
  requirementsLoading: boolean;
  allocationsLoading: boolean;
  timelineConfig: TimelineConfig;
  onTimelineConfigChange: (config: TimelineConfig) => void;
  onCreateRequirement: () => void;
  onEditRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onDeleteRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onIgnoreRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onUnIgnoreRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onCreateAllocation: () => void;
  onEditAllocation: (allocation: Tables<"project_allocations_detailed">) => void;
  onDeleteAllocation: (allocation: Tables<"project_allocations_detailed">) => void;
  onAllocatePosition: (position: any) => void;
  onEditPosition: (position: any) => void;
  onDeleteOrphanedAllocation: (allocationId: string) => void;
}

export function ProjectTabs({
  project,
  requirements,
  groupedRequirements,
  allocations,
  gaps,
  requirementsLoading,
  allocationsLoading,
  timelineConfig,
  onTimelineConfigChange,
  onCreateRequirement,
  onEditRequirement,
  onDeleteRequirement,
  onIgnoreRequirement,
  onUnIgnoreRequirement,
  onCreateAllocation,
  onEditAllocation,
  onDeleteAllocation,
  onAllocatePosition,
  onEditPosition,
  onDeleteOrphanedAllocation,
}: ProjectTabsProps) {
  if (!project) {
    return null;
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="resources">
          Resources
          {requirements && requirements.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {requirements.length}
            </Badge>
          )}
          {gaps && gaps.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {gaps.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="timeline">
          Timeline
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab
          project={project}
          requirements={requirements}
          allocations={allocations}
          gaps={gaps}
          requirementsLoading={requirementsLoading}
        />
      </TabsContent>

      <TabsContent value="resources">
        <ResourcesTab
          groupedRequirements={groupedRequirements}
          allocations={allocations}
          gaps={gaps}
          requirementsLoading={requirementsLoading}
          allocationsLoading={allocationsLoading}
          onCreateRequirement={onCreateRequirement}
          onEditRequirement={onEditRequirement}
          onDeleteRequirement={onDeleteRequirement}
          onIgnoreRequirement={onIgnoreRequirement}
          onUnIgnoreRequirement={onUnIgnoreRequirement}
          onCreateAllocation={onCreateAllocation}
          onEditAllocation={onEditAllocation}
          onDeleteAllocation={onDeleteAllocation}
          onAllocateToRequirement={onAllocatePosition}
        />
      </TabsContent>

      <TabsContent value="timeline">
        <TimelineTab
          groupedRequirements={groupedRequirements}
          allocations={allocations}
          timelineConfig={timelineConfig}
          project={project}
          onConfigChange={onTimelineConfigChange}
          onAllocatePosition={onAllocatePosition}
          onEditPosition={onEditPosition}
          onDeleteOrphanedAllocation={onDeleteOrphanedAllocation}
          onEditAllocation={onEditAllocation}
          onDeleteAllocation={onDeleteAllocation}
          onEditRequirement={onEditRequirement}
          onDeleteRequirement={onDeleteRequirement}
          onIgnoreRequirement={onIgnoreRequirement}
          onUnIgnoreRequirement={onUnIgnoreRequirement}
        />
      </TabsContent>
    </Tabs>
  );
}