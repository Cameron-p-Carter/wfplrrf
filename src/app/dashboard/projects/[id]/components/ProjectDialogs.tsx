import React from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequirementForm } from "./requirement-form";
import { AllocationForm } from "./allocation-form";
import { SmartAllocationForm } from "./smart-allocation-form";
import type { Tables } from "@/types/supabase";

interface ProjectDialogsProps {
  // Create Requirement Dialog
  showCreateDialog: boolean;
  onCreateDialogChange: (open: boolean) => void;
  onCreateRequirement: (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => Promise<void>;

  // Edit Requirement Dialog
  editingRequirement: Tables<"project_requirements_detailed"> | null;
  onEditingRequirementChange: (requirement: Tables<"project_requirements_detailed"> | null) => void;
  onUpdateRequirement: (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => Promise<void>;

  // Delete Requirement Dialog
  deletingRequirement: Tables<"project_requirements_detailed"> | null;
  onDeletingRequirementChange: (requirement: Tables<"project_requirements_detailed"> | null) => void;
  onDeleteRequirement: () => Promise<void>;
  isDeleting: boolean;

  // Create Allocation Dialog
  showCreateAllocationDialog: boolean;
  onCreateAllocationDialogChange: (open: boolean) => void;
  onCreateAllocation: (data: { person_id: string; role_type_id: string; allocation_percentage: number; start_date: string; end_date: string }) => Promise<void>;

  // Edit Allocation Dialog
  editingAllocation: Tables<"project_allocations_detailed"> | null;
  onEditingAllocationChange: (allocation: Tables<"project_allocations_detailed"> | null) => void;
  onUpdateAllocation: (data: { person_id: string; role_type_id: string; allocation_percentage: number; start_date: string; end_date: string }) => Promise<void>;

  // Delete Allocation Dialog
  deletingAllocation: Tables<"project_allocations_detailed"> | null;
  onDeletingAllocationChange: (allocation: Tables<"project_allocations_detailed"> | null) => void;
  onDeleteAllocation: () => Promise<void>;
  isDeletingAllocation: boolean;

  // Smart Allocation Dialog
  allocatingPosition: any;
  onAllocatingPositionChange: (position: any) => void;
  onPositionAllocation: (data: { person_id: string; role_type_id: string; allocation_percentage: number; start_date: string; end_date: string; requirement_id?: string }) => Promise<void>;

  // Edit Position Requirement Dialog
  editingPositionRequirement: any;
  onEditingPositionRequirementChange: (requirement: any) => void;
  onUpdatePositionRequirement: (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => Promise<void>;
}

export function ProjectDialogs({
  showCreateDialog,
  onCreateDialogChange,
  onCreateRequirement,
  editingRequirement,
  onEditingRequirementChange,
  onUpdateRequirement,
  deletingRequirement,
  onDeletingRequirementChange,
  onDeleteRequirement,
  isDeleting,
  showCreateAllocationDialog,
  onCreateAllocationDialogChange,
  onCreateAllocation,
  editingAllocation,
  onEditingAllocationChange,
  onUpdateAllocation,
  deletingAllocation,
  onDeletingAllocationChange,
  onDeleteAllocation,
  isDeletingAllocation,
  allocatingPosition,
  onAllocatingPositionChange,
  onPositionAllocation,
  editingPositionRequirement,
  onEditingPositionRequirementChange,
  onUpdatePositionRequirement,
}: ProjectDialogsProps) {
  return (
    <>
      {/* Create Requirement Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={onCreateDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Resource Requirement</DialogTitle>
            <DialogDescription>
              Define a resource requirement for this project
            </DialogDescription>
          </DialogHeader>
          <RequirementForm 
            onSubmit={onCreateRequirement} 
            onCancel={() => onCreateDialogChange(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Requirement Dialog */}
      <Dialog open={!!editingRequirement} onOpenChange={() => onEditingRequirementChange(null)}>
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
              onSubmit={onUpdateRequirement}
              onCancel={() => onEditingRequirementChange(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Requirement Confirmation */}
      <AlertDialog open={!!deletingRequirement} onOpenChange={() => onDeletingRequirementChange(null)}>
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
              onClick={onDeleteRequirement}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Allocation Dialog */}
      <Dialog open={showCreateAllocationDialog} onOpenChange={onCreateAllocationDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allocation</DialogTitle>
            <DialogDescription>
              Assign a person to this project
            </DialogDescription>
          </DialogHeader>
          <AllocationForm 
            onSubmit={onCreateAllocation} 
            onCancel={() => onCreateAllocationDialogChange(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Allocation Dialog */}
      <Dialog open={!!editingAllocation} onOpenChange={() => onEditingAllocationChange(null)}>
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
              onSubmit={onUpdateAllocation}
              onCancel={() => onEditingAllocationChange(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Allocation Confirmation */}
      <AlertDialog open={!!deletingAllocation} onOpenChange={() => onDeletingAllocationChange(null)}>
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
              onClick={onDeleteAllocation}
              disabled={isDeletingAllocation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAllocation ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Smart Allocation Dialog */}
      <Dialog open={!!allocatingPosition} onOpenChange={() => onAllocatingPositionChange(null)}>
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
              onSubmit={onPositionAllocation}
              onCancel={() => onAllocatingPositionChange(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Position Requirement Dialog */}
      <Dialog open={!!editingPositionRequirement} onOpenChange={() => onEditingPositionRequirementChange(null)}>
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
              onSubmit={onUpdatePositionRequirement}
              onCancel={() => onEditingPositionRequirementChange(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}