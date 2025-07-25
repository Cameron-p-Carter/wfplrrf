import { supabase, hasDateOverlap } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Project Allocations CRUD operations
export async function getProjectAllocations(projectId: string): Promise<Tables<"project_allocations_detailed">[]> {
  try {
    const { data, error } = await supabase
      .from("project_allocations_detailed")
      .select("*")
      .eq("project_id", projectId)
      .order("start_date");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch project allocations");
  }
}

export async function getPersonAllocations(personId: string): Promise<Tables<"project_allocations_detailed">[]> {
  try {
    const { data, error } = await supabase
      .from("project_allocations_detailed")
      .select("*")
      .eq("person_id", personId)
      .order("start_date");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch person allocations");
  }
}

export async function getAllAllocations(): Promise<Tables<"project_allocations_detailed">[]> {
  try {
    const { data, error } = await supabase
      .from("project_allocations_detailed")
      .select("*")
      .order("start_date");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch all allocations");
  }
}

export async function createProjectAllocation(allocation: TablesInsert<"project_allocations">): Promise<Tables<"project_allocations">> {
  try {
    const { data, error } = await supabase
      .from("project_allocations")
      .insert(allocation)
      .select()
      .single();
    
    if (error) throw error;
    
    // Trigger auto-generation for the new allocation
    if (data) {
      const { processAllocationAutoGeneration } = await import("../business-logic/auto-generation");
      await processAllocationAutoGeneration(data.id);
    }
    
    return data;
  } catch (error) {
    handleDatabaseError(error, "create project allocation");
  }
}

export async function updateProjectAllocation(id: string, allocation: TablesUpdate<"project_allocations">): Promise<Tables<"project_allocations">> {
  try {
    const { data, error } = await supabase
      .from("project_allocations")
      .update(allocation)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Trigger auto-generation for the updated allocation
    if (data) {
      const { processAllocationAutoGeneration } = await import("../business-logic/auto-generation");
      await processAllocationAutoGeneration(data.id);
    }
    
    return data;
  } catch (error) {
    handleDatabaseError(error, "update project allocation");
  }
}

export async function deleteProjectAllocation(id: string): Promise<void> {
  try {
    // Clean up auto-generated requirements before deleting the allocation
    const { cleanupAutoGeneratedRequirements } = await import("../business-logic/auto-generation");
    await cleanupAutoGeneratedRequirements(id);
    
    const { error } = await supabase
      .from("project_allocations")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, "delete project allocation");
  }
}

// Utility functions for allocation calculations
export async function getPersonUtilization(personId: string, startDate: string, endDate: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("project_allocations")
      .select("allocation_percentage, start_date, end_date")
      .eq("person_id", personId)
      .gte("end_date", startDate)
      .lte("start_date", endDate);
    
    if (error) throw error;
    
    // Calculate overlapping utilization
    let totalUtilization = 0;
    if (data) {
      for (const allocation of data) {
        const allocStart = new Date(allocation.start_date);
        const allocEnd = new Date(allocation.end_date);
        const queryStart = new Date(startDate);
        const queryEnd = new Date(endDate);
        
        // Check if there's overlap
        if (hasDateOverlap(allocStart, allocEnd, queryStart, queryEnd)) {
          totalUtilization += allocation.allocation_percentage;
        }
      }
    }
    
    return Math.min(totalUtilization, 100); // Cap at 100%
  } catch (error) {
    handleDatabaseError(error, "calculate person utilization");
  }
}

export async function getOverAllocatedPeople(): Promise<any[]> {
  try {
    const { data: allocations, error } = await supabase
      .from("project_allocations_detailed")
      .select("*");
    
    if (error) throw error;
    
    const overAllocated = [];
    const peopleMap = new Map();
    
    // Group allocations by person and date ranges
    for (const allocation of allocations) {
      if (!allocation.person_id || !allocation.start_date || !allocation.end_date) continue;
      
      const personId = allocation.person_id;
      if (!peopleMap.has(personId)) {
        peopleMap.set(personId, {
          person_id: personId,
          person_name: allocation.person_name,
          allocations: []
        });
      }
      
      peopleMap.get(personId).allocations.push(allocation);
    }
    
    // Check for over-allocation
    for (const [personId, personData] of peopleMap) {
      const allocations = personData.allocations;
      
      // Find overlapping periods
      for (let i = 0; i < allocations.length; i++) {
        for (let j = i + 1; j < allocations.length; j++) {
          const alloc1 = allocations[i];
          const alloc2 = allocations[j];
          
          // Check if periods overlap
          if (hasDateOverlap(
            new Date(alloc1.start_date!), new Date(alloc1.end_date!),
            new Date(alloc2.start_date!), new Date(alloc2.end_date!)
          )) {
            const totalAllocation = (alloc1.allocation_percentage || 0) + (alloc2.allocation_percentage || 0);
            
            if (totalAllocation > 100) {
              overAllocated.push({
                person_id: personId,
                person_name: personData.person_name,
                total_allocation: totalAllocation,
                conflicting_allocations: [alloc1, alloc2]
              });
            }
          }
        }
      }
    }
    
    return overAllocated;
  } catch (error) {
    handleDatabaseError(error, "get over-allocated people");
  }
}

// Check for leave conflicts during allocation
export async function getPersonLeaveConflicts(personId: string, startDate: string, endDate: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from("leave_periods")
      .select("*")
      .eq("person_id", personId)
      .gte("end_date", startDate)
      .lte("start_date", endDate);
    
    if (error) throw error;
    
    // Separate by leave status
    const conflicts = {
      pending: data?.filter(leave => leave.status === "pending") || [],
      approved: data?.filter(leave => leave.status === "approved") || [],
      unapproved: data?.filter(leave => leave.status === "unapproved") || []
    };
    
    return conflicts;
  } catch (error) {
    handleDatabaseError(error, "get person leave conflicts");
  }
}