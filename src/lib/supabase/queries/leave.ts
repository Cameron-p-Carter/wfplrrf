import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Leave Periods CRUD operations
export async function getPersonLeave(personId: string): Promise<Tables<"leave_periods">[]> {
  try {
    const { data, error } = await supabase
      .from("leave_periods")
      .select("*")
      .eq("person_id", personId)
      .order("start_date");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch person leave");
  }
}

export async function getAllLeave(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("leave_periods")
      .select(`
        *,
        people!inner(
          id,
          name,
          role_types(name)
        )
      `)
      .order("start_date");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch all leave");
  }
}

export async function getLeavePeriodById(id: string): Promise<Tables<"leave_periods">> {
  try {
    const { data, error } = await supabase
      .from("leave_periods")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch leave period");
  }
}

export async function createLeavePeriod(leave: TablesInsert<"leave_periods">): Promise<Tables<"leave_periods">> {
  try {
    const { data, error } = await supabase
      .from("leave_periods")
      .insert(leave)
      .select()
      .single();
    
    if (error) throw error;
    
    // If the leave is approved, trigger auto-generation for existing allocations
    if (data && leave.status === "approved") {
      const { processLeaveCreationForExistingAllocations } = await import("../business-logic/leave-management");
      await processLeaveCreationForExistingAllocations(leave.person_id!, data.id);
    }
    
    return data;
  } catch (error) {
    handleDatabaseError(error, "create leave period");
  }
}

export async function updateLeavePeriod(id: string, leave: TablesUpdate<"leave_periods">): Promise<Tables<"leave_periods">> {
  try {
    const { data, error } = await supabase
      .from("leave_periods")
      .update(leave)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "update leave period");
  }
}

export async function updateLeaveStatus(id: string, status: "pending" | "approved" | "unapproved"): Promise<Tables<"leave_periods">> {
  try {
    // Get the leave period to find the person_id
    const { data: leavePeriod, error: leaveError } = await supabase
      .from("leave_periods")
      .select("person_id")
      .eq("id", id)
      .single();

    if (leaveError) throw leaveError;

    const { data, error } = await supabase
      .from("leave_periods")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Process auto-generation based on leave status change
    if (data && leavePeriod) {
      const { processLeaveStatusChange } = await import("../business-logic/leave-management");
      await processLeaveStatusChange(leavePeriod.person_id, id, status);
    }
    
    return data;
  } catch (error) {
    handleDatabaseError(error, "update leave status");
  }
}

export async function deleteLeavePeriod(id: string): Promise<void> {
  try {
    // Get the leave period details before deletion
    const { data: leave, error: leaveError } = await supabase
      .from("leave_periods")
      .select("*")
      .eq("id", id)
      .single();

    if (leaveError) throw leaveError;
    if (!leave) throw new Error("Leave period not found");

    // If the leave was approved, clean up any leave coverage requirements
    if (leave.status === "approved") {
      const { processLeaveDeletionForExistingAllocations } = await import("../business-logic/leave-management");
      await processLeaveDeletionForExistingAllocations(leave.person_id, leave);
    }

    // Delete the leave period
    const { error } = await supabase
      .from("leave_periods")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, "delete leave period");
  }
}

export async function getPendingLeave(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("leave_periods")
      .select(`
        *,
        people!inner(
          id,
          name,
          role_types(name)
        )
      `)
      .eq("status", "pending")
      .order("start_date");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch pending leave");
  }
}