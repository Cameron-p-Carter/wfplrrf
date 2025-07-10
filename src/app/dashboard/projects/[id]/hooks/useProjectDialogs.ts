import { useState } from "react";
import type { Tables } from "@/types/supabase";

export function useProjectDialogs() {
  // Requirements dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Tables<"project_requirements_detailed"> | null>(null);
  const [deletingRequirement, setDeletingRequirement] = useState<Tables<"project_requirements_detailed"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Allocations dialogs
  const [showCreateAllocationDialog, setShowCreateAllocationDialog] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Tables<"project_allocations_detailed"> | null>(null);
  const [deletingAllocation, setDeletingAllocation] = useState<Tables<"project_allocations_detailed"> | null>(null);
  const [isDeletingAllocation, setIsDeletingAllocation] = useState(false);
  
  // Position-based dialogs
  const [allocatingPosition, setAllocatingPosition] = useState<any>(null);
  const [editingPositionRequirement, setEditingPositionRequirement] = useState<any>(null);

  const closeAllDialogs = () => {
    setShowCreateDialog(false);
    setEditingRequirement(null);
    setDeletingRequirement(null);
    setShowCreateAllocationDialog(false);
    setEditingAllocation(null);
    setDeletingAllocation(null);
    setAllocatingPosition(null);
    setEditingPositionRequirement(null);
    setIsDeleting(false);
    setIsDeletingAllocation(false);
  };

  return {
    // Requirements
    showCreateDialog,
    setShowCreateDialog,
    editingRequirement,
    setEditingRequirement,
    deletingRequirement,
    setDeletingRequirement,
    isDeleting,
    setIsDeleting,
    
    // Allocations
    showCreateAllocationDialog,
    setShowCreateAllocationDialog,
    editingAllocation,
    setEditingAllocation,
    deletingAllocation,
    setDeletingAllocation,
    isDeletingAllocation,
    setIsDeletingAllocation,
    
    // Positions
    allocatingPosition,
    setAllocatingPosition,
    editingPositionRequirement,
    setEditingPositionRequirement,
    
    // Utilities
    closeAllDialogs,
  };
}