"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProjectById } from "@/lib/supabase";
import { useProjectRequirements } from "@/lib/hooks/use-project-requirements";
import { useProjectAllocations } from "@/lib/hooks/use-project-allocations";
import { RequirementForm } from "./components/requirement-form";
import { AllocationForm } from "./components/allocation-form";
import { Timeline } from "@/components/ui/timeline";
import { InteractiveTimeline } from "@/components/ui/interactive-timeline";
import { ProjectTimeline } from "@/components/ui/project-timeline";
import { SmartAllocationForm } from "./components/smart-allocation-form";
import { formatDate } from "@/lib/utils/date";
import { getDefaultTimelineRange, getDataBasedTimelineRange, TimelineItem, TimelineConfig } from "@/lib/utils/timeline";
import type { Tables } from "@/types/supabase";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Tables<"projects"> | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const { requirements, groupedRequirements, loading: requirementsLoading, create, update, remove, refetch: refetchRequirements } = useProjectRequirements(projectId);
  const { allocations, gaps, loading: allocationsLoading, create: createAllocation, update: updateAllocation, remove: removeAllocation, refetch: refetchAllocations } = useProjectAllocations(projectId);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Tables<"project_requirements_detailed"> | null>(null);
  const [deletingRequirement, setDeletingRequirement] = useState<Tables<"project_requirements_detailed"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showCreateAllocationDialog, setShowCreateAllocationDialog] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Tables<"project_allocations_detailed"> | null>(null);
  const [deletingAllocation, setDeletingAllocation] = useState<Tables<"project_allocations_detailed"> | null>(null);
  const [isDeletingAllocation, setIsDeletingAllocation] = useState(false);
  
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>(() => ({
    ...getDefaultTimelineRange(),
    granularity: 'month' as const,
  }));

  // Update timeline range when data changes
  useEffect(() => {
    if (!requirementsLoading && !allocationsLoading && (requirements.length > 0 || allocations.length > 0)) {
      const dataBasedRange = getDataBasedTimelineRange(
        requirements,
        allocations,
        project ? new Date(project.start_date) : undefined,
        project ? new Date(project.end_date) : undefined
      );
      
      setTimelineConfig(prev => ({
        ...prev,
        startDate: dataBasedRange.startDate,
        endDate: dataBasedRange.endDate,
      }));
    }
  }, [requirements, allocations, project, requirementsLoading, allocationsLoading]);

  // New state for position-based allocation
  const [allocatingPosition, setAllocatingPosition] = useState<any>(null);
  const [editingPositionRequirement, setEditingPositionRequirement] = useState<any>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setProjectLoading(true);
        const data = await getProjectById(projectId);
        setProject(data);
      } catch (error) {
        console.error("Failed to fetch project:", error);
        router.push("/dashboard/projects");
      } finally {
        setProjectLoading(false);
      }
    };

    fetchProject();
  }, [projectId, router]);

  const getProjectStatus = (project: Tables<"projects">) => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (now < startDate) {
      return { label: "Not Started", variant: "secondary" as const };
    } else if (now > endDate) {
      return { label: "Completed", variant: "outline" as const };
    } else {
      return { label: "Active", variant: "default" as const };
    }
  };

  const handleCreateRequirement = async (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => {
    try {
      await create({ ...data, project_id: projectId });
      setShowCreateDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdateRequirement = async (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => {
    if (!editingRequirement) return;
    try {
      await update(editingRequirement.id!, { ...data, project_id: projectId });
      setEditingRequirement(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteRequirement = async () => {
    if (!deletingRequirement) return;
    try {
      setIsDeleting(true);
      await remove(deletingRequirement.id!);
      await refetchAllocations(); // Refresh allocations to show any newly orphaned allocations
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
      await refetchRequirements(); // Refresh requirements to show any auto-generated requirements
      setShowCreateAllocationDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdateAllocation = async (data: { person_id: string; role_type_id: string; allocation_percentage: number; start_date: string; end_date: string }) => {
    if (!editingAllocation) return;
    try {
      await updateAllocation(editingAllocation.id!, { ...data, project_id: projectId });
      await refetchRequirements(); // Refresh requirements to show any auto-generated requirements
      setEditingAllocation(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteAllocation = async () => {
    if (!deletingAllocation) return;
    try {
      setIsDeletingAllocation(true);
      await removeAllocation(deletingAllocation.id!);
      await refetchRequirements(); // Refresh requirements to remove any cleaned up auto-generated requirements
      setDeletingAllocation(null);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsDeletingAllocation(false);
    }
  };

  const getTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];
    
    // Add requirements as timeline items
    requirements.forEach(req => {
      if (req.start_date && req.end_date && req.role_type_name) {
        items.push({
          id: `req-${req.id}`,
          title: `${req.role_type_name} (${req.required_count} needed)`,
          startDate: new Date(req.start_date),
          endDate: new Date(req.end_date),
          type: 'requirement',
          metadata: req,
        });
      }
    });
    
    // Add allocations as timeline items
    allocations.forEach(alloc => {
      if (alloc.start_date && alloc.end_date && alloc.person_name) {
        items.push({
          id: `alloc-${alloc.id}`,
          title: `${alloc.person_name} (${alloc.role_type_name})`,
          startDate: new Date(alloc.start_date),
          endDate: new Date(alloc.end_date),
          type: 'allocation',
          percentage: alloc.allocation_percentage || 0,
          metadata: alloc,
        });
      }
    });
    
    // Add gaps as timeline items
    gaps.forEach((gap, index) => {
      if (gap.start_date && gap.end_date && gap.role_type_name) {
        items.push({
          id: `gap-${index}`,
          title: `${gap.role_type_name} Gap (${gap.gap_count.toFixed(1)} needed)`,
          startDate: new Date(gap.start_date),
          endDate: new Date(gap.end_date),
          type: 'gap',
          metadata: gap,
        });
      }
    });
    
    return items;
  };

  const handleTimelineItemClick = (item: TimelineItem) => {
    if (item.type === 'requirement' && item.metadata) {
      setEditingRequirement(item.metadata);
    } else if (item.type === 'allocation' && item.metadata) {
      setEditingAllocation(item.metadata);
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
      await refetchRequirements(); // Refresh requirements to show any auto-generated requirements
      setAllocatingPosition(null);
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

  const status = getProjectStatus(project);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/projects")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-muted-foreground">
              {formatDate(project.start_date)} - {formatDate(project.end_date)}
            </p>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requirements">
              Requirements
              {requirements.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {requirements.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="allocations">
              Allocations
              {allocations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {allocations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="gaps">
              Gaps
              {gaps.length > 0 && (
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
                      <Badge variant={status.variant}>{status.label}</Badge>
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
                  ) : requirements.length === 0 ? (
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
                        <span className="font-medium">{allocations.length}</span> current allocations
                      </p>
                      {gaps.length > 0 && (
                        <p className="text-sm text-destructive">
                          <span className="font-medium">{gaps.length}</span> resource gaps
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requirements">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resource Requirements</CardTitle>
                    <CardDescription>
                      Define the people and roles needed for this project
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Requirement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {requirementsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Type</TableHead>
                        <TableHead>Required Count</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedRequirements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No resource requirements defined. Add the first requirement to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        groupedRequirements.map((requirement) => (
                          <React.Fragment key={requirement.id}>
                            {/* Parent Requirement */}
                            <TableRow className="border-b">
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <span>{requirement.role_type_name}</span>
                                  {requirement.auto_generated_type && (
                                    <Badge 
                                      variant={requirement.auto_generated_type === 'leave_coverage' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {requirement.auto_generated_type === 'leave_coverage' ? 'Leave Coverage' : 'Partial Gap'}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {requirement.required_count} {requirement.required_count === 1 ? 'person' : 'people'}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(requirement.start_date!)}</TableCell>
                              <TableCell>{formatDate(requirement.end_date!)}</TableCell>
                              <TableCell>
                                {!requirement.auto_generated_type && (
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingRequirement(requirement)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeletingRequirement(requirement)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                            
                            {/* Child Requirements (Auto-Generated) */}
                            {requirement.children && requirement.children.map((child) => (
                              <TableRow key={child.id} className="bg-gray-50 border-l-4 border-l-blue-200">
                                <TableCell className="font-medium pl-8">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground">↳</span>
                                    <span>{child.role_type_name}</span>
                                    <Badge 
                                      variant={child.auto_generated_type === 'leave_coverage' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {child.auto_generated_type === 'leave_coverage' ? 'Leave Coverage' : 'Partial Gap'}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {child.required_count} {child.required_count === 1 ? 'person' : 'people'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{formatDate(child.start_date!)}</TableCell>
                                <TableCell className="text-sm">{formatDate(child.end_date!)}</TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">Auto-generated</span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocations">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resource Allocations</CardTitle>
                    <CardDescription>
                      People assigned to this project
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateAllocationDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Allocation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allocationsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Person</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Allocation</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No allocations yet. Add the first allocation to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        allocations.map((allocation) => (
                          <TableRow key={allocation.id}>
                            <TableCell className="font-medium">
                              {allocation.person_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{allocation.role_type_name}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                (allocation.allocation_percentage || 0) > 100 ? "destructive" :
                                (allocation.allocation_percentage || 0) >= 80 ? "default" : "secondary"
                              }>
                                {allocation.allocation_percentage}%
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(allocation.start_date!)}</TableCell>
                            <TableCell>{formatDate(allocation.end_date!)}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingAllocation(allocation)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingAllocation(allocation)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps">
            <Card>
              <CardHeader>
                <CardTitle>Resource Gaps</CardTitle>
                <CardDescription>
                  Unfilled resource requirements that need attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocationsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[120px]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Allocated</TableHead>
                        <TableHead>Gap</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gaps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No resource gaps! All requirements are fully allocated.
                          </TableCell>
                        </TableRow>
                      ) : (
                        gaps.map((gap, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {gap.role_type_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{gap.required_count}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{gap.allocated_count.toFixed(1)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">{gap.gap_count.toFixed(1)}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(gap.start_date)}</TableCell>
                            <TableCell>{formatDate(gap.end_date)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <ProjectTimeline
              title="Project Resource Timeline"
              requirements={requirements}
              allocations={allocations}
              config={timelineConfig}
              onConfigChange={setTimelineConfig}
              onAllocatePosition={handleAllocatePosition}
              onEditPosition={handleEditPosition}
              onDeleteOrphanedAllocation={removeAllocation}
              onEditAllocation={setEditingAllocation}
              onDeleteAllocation={removeAllocation}
              onEditRequirement={setEditingRequirement}
              onDeleteRequirement={setDeletingRequirement}
              projectStartDate={project ? new Date(project.start_date) : undefined}
              projectEndDate={project ? new Date(project.end_date) : undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Requirement Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Resource Requirement</DialogTitle>
            <DialogDescription>
              Define a resource requirement for this project
            </DialogDescription>
          </DialogHeader>
          <RequirementForm 
            onSubmit={handleCreateRequirement} 
            onCancel={() => setShowCreateDialog(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Requirement Dialog */}
      <Dialog open={!!editingRequirement} onOpenChange={() => setEditingRequirement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resource Requirement</DialogTitle>
            <DialogDescription>
              Update the resource requirement details
            </DialogDescription>
          </DialogHeader>
          {editingRequirement && (
            <RequirementForm
              initialData={{
                role_type_id: editingRequirement.role_type_id!,
                required_count: editingRequirement.required_count!,
                start_date: editingRequirement.start_date!,
                end_date: editingRequirement.end_date!,
              }}
              onSubmit={handleUpdateRequirement}
              onCancel={() => setEditingRequirement(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRequirement} onOpenChange={() => setDeletingRequirement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resource requirement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequirement}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Allocation Dialog */}
      <Dialog open={showCreateAllocationDialog} onOpenChange={setShowCreateAllocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allocation</DialogTitle>
            <DialogDescription>
              Assign a person to this project
            </DialogDescription>
          </DialogHeader>
          <AllocationForm 
            onSubmit={handleCreateAllocation} 
            onCancel={() => setShowCreateAllocationDialog(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Allocation Dialog */}
      <Dialog open={!!editingAllocation} onOpenChange={() => setEditingAllocation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Allocation</DialogTitle>
            <DialogDescription>
              Update the allocation details
            </DialogDescription>
          </DialogHeader>
          {editingAllocation && (
            <AllocationForm
              initialData={{
                person_id: editingAllocation.person_id!,
                role_type_id: editingAllocation.role_type_id!,
                allocation_percentage: editingAllocation.allocation_percentage!,
                start_date: editingAllocation.start_date!,
                end_date: editingAllocation.end_date!,
              }}
              onSubmit={handleUpdateAllocation}
              onCancel={() => setEditingAllocation(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Allocation Confirmation */}
      <AlertDialog open={!!deletingAllocation} onOpenChange={() => setDeletingAllocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this allocation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllocation}
              disabled={isDeletingAllocation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAllocation ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Smart Allocation Dialog */}
      <Dialog open={!!allocatingPosition} onOpenChange={() => setAllocatingPosition(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Allocate Person to Position</DialogTitle>
            <DialogDescription>
              Assign someone to this {allocatingPosition?.roleTypeName} position
            </DialogDescription>
          </DialogHeader>
          {allocatingPosition && (
            <SmartAllocationForm
              prefilledData={{
                role_type_id: allocatingPosition.requirement.role_type_id,
                start_date: allocatingPosition.requirement.start_date,
                end_date: allocatingPosition.requirement.end_date,
                requirement_id: allocatingPosition.requirement.id,
                requiredCount: allocatingPosition.requirement.required_count,
              }}
              onSubmit={handlePositionAllocation}
              onCancel={() => setAllocatingPosition(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Position Requirement Dialog */}
      <Dialog open={!!editingPositionRequirement} onOpenChange={() => setEditingPositionRequirement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Position Requirement</DialogTitle>
            <DialogDescription>
              Update this specific position requirement
            </DialogDescription>
          </DialogHeader>
          {editingPositionRequirement && (
            <RequirementForm
              initialData={{
                role_type_id: editingPositionRequirement.role_type_id!,
                required_count: editingPositionRequirement.required_count!,
                start_date: editingPositionRequirement.start_date!,
                end_date: editingPositionRequirement.end_date!,
              }}
              onSubmit={async (data) => {
                try {
                  await update(editingPositionRequirement.id!, { ...data, project_id: projectId });
                  setEditingPositionRequirement(null);
                } catch (error) {
                  // Error is handled in the hook
                }
              }}
              onCancel={() => setEditingPositionRequirement(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
