"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectDetail } from "./hooks/useProjectDetail";
import { useProjectDialogs } from "./hooks/useProjectDialogs";
import { useProjectTimeline } from "./hooks/useProjectTimeline";
import { ProjectHeader } from "./components/ProjectHeader";
import { ProjectTabs } from "./components/ProjectTabs";
import { ProjectDialogs } from "./components/ProjectDialogs";
import type { Tables } from "@/types/supabase";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const { project, loading: projectLoading, requirements, groupedRequirements, allocations, gaps, requirementsLoading, allocationsLoading, refetchRequirements, refetchAllocations, create, update, remove, createAllocation, updateAllocation, removeAllocation } = useProjectDetail(projectId);
  
  const {
    showCreateDialog,
    setShowCreateDialog,
    editingRequirement,
    setEditingRequirement,
    deletingRequirement,
    setDeletingRequirement,
    isDeleting,
    setIsDeleting,
    showCreateAllocationDialog,
    setShowCreateAllocationDialog,
    editingAllocation,
    setEditingAllocation,
    deletingAllocation,
    setDeletingAllocation,
    isDeletingAllocation,
    setIsDeletingAllocation,
    allocatingPosition,
    setAllocatingPosition,
    editingPositionRequirement,
    setEditingPositionRequirement,
  } = useProjectDialogs();
  
  const { timelineConfig, setTimelineConfig } = useProjectTimeline(requirements, allocations, gaps, project, requirementsLoading, allocationsLoading);

  const handleCreateRequirement = async (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => {
    try {
      await create({ ...data, project_id: projectId });
      setShowCreateDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdateRequirement = async (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => {
    if (!editingRequirement || !editingRequirement.id) return;
    try {
      await update(editingRequirement.id, { ...data, project_id: projectId });
      setEditingRequirement(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteRequirement = async () => {
    if (!deletingRequirement || !deletingRequirement.id) return;
    try {
      setIsDeleting(true);
      await remove(deletingRequirement.id);
      await refetchAllocations();
      setDeletingRequirement(null);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateAllocation = async (data: { person_id: string; role_type_id: string; allocation_percentage: number; start_date: string; end_date: string }) => {
    try {
      await createAllocation({ ...data, project_id: projectId });
      await refetchRequirements();
      setShowCreateAllocationDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdateAllocation = async (data: { person_id: string; role_type_id: string; allocation_percentage: number; start_date: string; end_date: string }) => {
    if (!editingAllocation || !editingAllocation.id) return;
    try {
      await updateAllocation(editingAllocation.id, { ...data, project_id: projectId });
      await refetchRequirements();
      setEditingAllocation(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteAllocation = async () => {
    if (!deletingAllocation) return;
    
    // Handle case where deletingAllocation might be a string ID instead of an object
    let allocationId: string;
    
    if (typeof deletingAllocation === 'string') {
      allocationId = deletingAllocation;
    } else if (typeof deletingAllocation === 'object') {
      allocationId = deletingAllocation.id || deletingAllocation.allocation_id;
      
      if (!allocationId) {
        console.error('No allocation ID found in object:', deletingAllocation);
        console.error('Available keys:', Object.keys(deletingAllocation));
        return;
      }
    } else {
      console.error('Invalid deletingAllocation type:', typeof deletingAllocation, deletingAllocation);
      return;
    }
    
    try {
      setIsDeletingAllocation(true);
      await removeAllocation(allocationId);
      await refetchRequirements();
      await refetchAllocations();
      setDeletingAllocation(null);
    } catch (error) {
      console.error('Error deleting allocation:', error);
      // Error is handled in the hook
    } finally {
      setIsDeletingAllocation(false);
    }
  };

  const handleAllocatePosition = (position: any) => {
    setAllocatingPosition(position);
  };

  const handleEditPosition = (position: any) => {
    setEditingPositionRequirement(position.requirement);
  };

  const handlePositionAllocation = async (data: { person_id: string; role_type_id: string; allocation_percentage: number; start_date: string; end_date: string; requirement_id?: string }) => {
    try {
      await createAllocation({ ...data, project_id: projectId });
      await refetchRequirements();
      setAllocatingPosition(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdatePositionRequirement = async (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => {
    if (!editingPositionRequirement || !editingPositionRequirement.id) return;
    try {
      await update(editingPositionRequirement.id, { ...data, project_id: projectId });
      setEditingPositionRequirement(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <p className="text-muted-foreground">The project you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/dashboard/projects")} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        loading={projectLoading}
        onBack={() => router.push("/dashboard/projects")}
      />

      <ProjectTabs
        project={project}
        requirements={requirements}
        groupedRequirements={groupedRequirements}
        allocations={allocations}
        gaps={gaps}
        requirementsLoading={requirementsLoading}
        allocationsLoading={allocationsLoading}
        timelineConfig={timelineConfig}
        onTimelineConfigChange={setTimelineConfig}
        onCreateRequirement={() => setShowCreateDialog(true)}
        onEditRequirement={setEditingRequirement}
        onDeleteRequirement={setDeletingRequirement}
        onCreateAllocation={() => setShowCreateAllocationDialog(true)}
        onEditAllocation={setEditingAllocation}
        onDeleteAllocation={setDeletingAllocation}
        onAllocatePosition={handleAllocatePosition}
        onEditPosition={handleEditPosition}
        onDeleteOrphanedAllocation={removeAllocation}
      />

      <ProjectDialogs
        showCreateDialog={showCreateDialog}
        onCreateDialogChange={setShowCreateDialog}
        onCreateRequirement={handleCreateRequirement}
        editingRequirement={editingRequirement}
        onEditingRequirementChange={setEditingRequirement}
        onUpdateRequirement={handleUpdateRequirement}
        deletingRequirement={deletingRequirement}
        onDeletingRequirementChange={setDeletingRequirement}
        onDeleteRequirement={handleDeleteRequirement}
        isDeleting={isDeleting}
        showCreateAllocationDialog={showCreateAllocationDialog}
        onCreateAllocationDialogChange={setShowCreateAllocationDialog}
        onCreateAllocation={handleCreateAllocation}
        editingAllocation={editingAllocation}
        onEditingAllocationChange={setEditingAllocation}
        onUpdateAllocation={handleUpdateAllocation}
        deletingAllocation={deletingAllocation}
        onDeletingAllocationChange={setDeletingAllocation}
        onDeleteAllocation={handleDeleteAllocation}
        isDeletingAllocation={isDeletingAllocation}
        allocatingPosition={allocatingPosition}
        onAllocatingPositionChange={setAllocatingPosition}
        onPositionAllocation={handlePositionAllocation}
        editingPositionRequirement={editingPositionRequirement}
        onEditingPositionRequirementChange={setEditingPositionRequirement}
        onUpdatePositionRequirement={handleUpdatePositionRequirement}
      />
    </div>
  );
}
