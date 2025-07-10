import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OverviewTab } from "./tabs/OverviewTab";
import { RequirementsTab } from "./tabs/RequirementsTab";
import { AllocationsTab } from "./tabs/AllocationsTab";
import { GapsTab } from "./tabs/GapsTab";
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
        <TabsTrigger value="requirements">
          Requirements
          {requirements && requirements.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {requirements.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="allocations">
          Allocations
          {allocations && allocations.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {allocations.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="gaps">
          Gaps
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

      <TabsContent value="requirements">
        <RequirementsTab
          groupedRequirements={groupedRequirements}
          loading={requirementsLoading}
          onCreateRequirement={onCreateRequirement}
          onEditRequirement={onEditRequirement}
          onDeleteRequirement={onDeleteRequirement}
        />
      </TabsContent>

      <TabsContent value="allocations">
        <AllocationsTab
          allocations={allocations}
          loading={allocationsLoading}
          onCreateAllocation={onCreateAllocation}
          onEditAllocation={onEditAllocation}
          onDeleteAllocation={onDeleteAllocation}
        />
      </TabsContent>

      <TabsContent value="gaps">
        <GapsTab
          gaps={gaps}
          loading={allocationsLoading}
        />
      </TabsContent>

      <TabsContent value="timeline">
        <TimelineTab
          requirements={requirements}
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
        />
      </TabsContent>
    </Tabs>
  );
}