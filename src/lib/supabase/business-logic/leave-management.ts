import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import { generateLeaveGapRequirements } from "./auto-generation";
import type { Tables } from "@/types/supabase";

// Leave management business logic
export async function processLeaveCreationForExistingAllocations(personId: string, leaveId: string): Promise<any> {
  try {
    // Get the newly created leave period
    const { data: leave } = await supabase
      .from("leave_periods")
      .select("*")
      .eq("id", leaveId)
      .single();

    if (!leave) return { success: false, error: "Leave period not found" };

    // Find all allocations for this person that overlap with the new leave period
    const { data: allocations } = await supabase
      .from("project_allocations")
      .select("*")
      .eq("person_id", personId)
      .gte("end_date", leave.start_date)
      .lte("start_date", leave.end_date);

    if (allocations && allocations.length > 0) {
      console.log(`Found ${allocations.length} allocations that overlap with new leave period`);
      
      // Regenerate leave gap requirements for all affected allocations
      for (const allocation of allocations) {
        console.log(`Processing allocation ${allocation.id} for new leave coverage`);
        await generateLeaveGapRequirements(allocation.id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing leave creation for existing allocations:", error);
    return { success: false, error };
  }
}

export async function processLeaveDeletionForExistingAllocations(personId: string, deletedLeave: Tables<"leave_periods">): Promise<any> {
  try {
    console.log(`Processing leave deletion for person ${personId}, leave period: ${deletedLeave.start_date} to ${deletedLeave.end_date}`);

    // Find all allocations for this person that overlap with the deleted leave period
    const { data: allocations } = await supabase
      .from("project_allocations")
      .select("*")
      .eq("person_id", personId)
      .gte("end_date", deletedLeave.start_date)
      .lte("start_date", deletedLeave.end_date);

    if (allocations && allocations.length > 0) {
      console.log(`Found ${allocations.length} allocations that overlapped with deleted leave period`);
      
      // For each affected allocation, clean up leave coverage requirements that match the deleted leave period
      for (const allocation of allocations) {
        console.log(`Cleaning up leave coverage requirements for allocation ${allocation.id}`);
        
        // Find leave coverage requirements for this allocation
        const { data: leaveReqs } = await supabase
          .from("project_resource_requirements")
          .select("*")
          .eq("auto_generated_type", "leave_coverage")
          .eq("source_allocation_id", allocation.id);

        if (leaveReqs && leaveReqs.length > 0) {
          for (const req of leaveReqs) {
            // Check if this requirement overlaps with the deleted leave period
            const reqStart = new Date(req.start_date);
            const reqEnd = new Date(req.end_date);
            const leaveStart = new Date(deletedLeave.start_date);
            const leaveEnd = new Date(deletedLeave.end_date);

            // If the requirement overlaps with the deleted leave period
            if (reqStart <= leaveEnd && reqEnd >= leaveStart) {
              console.log(`Found overlapping leave coverage requirement ${req.id}, checking if it can be deleted`);
              
              // Check if this requirement has any allocations
              const { data: reqAllocations } = await supabase
                .from("project_allocations")
                .select("id")
                .eq("requirement_id", req.id);

              if (!reqAllocations || reqAllocations.length === 0) {
                // Safe to delete - no one is allocated to this leave coverage requirement
                console.log(`Deleting leave coverage requirement ${req.id} (no allocations)`);
                await supabase
                  .from("project_resource_requirements")
                  .delete()
                  .eq("id", req.id);
              } else {
                console.log(`Keeping leave coverage requirement ${req.id} (has ${reqAllocations.length} allocations)`);
              }
            }
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing leave deletion for existing allocations:", error);
    return { success: false, error };
  }
}

export async function processLeaveStatusChange(personId: string, leaveId: string, newStatus: "pending" | "approved" | "unapproved"): Promise<any> {
  try {
    if (newStatus === "approved") {
      // Get all allocations for this person that might be affected by this leave
      const { data: leave } = await supabase
        .from("leave_periods")
        .select("*")
        .eq("id", leaveId)
        .single();

      if (!leave) return { success: false, error: "Leave period not found" };

      const { data: allocations } = await supabase
        .from("project_allocations")
        .select("*")
        .eq("person_id", personId)
        .gte("end_date", leave.start_date)
        .lte("start_date", leave.end_date);

      if (allocations) {
        // Regenerate leave gap requirements for all affected allocations
        for (const allocation of allocations) {
          await generateLeaveGapRequirements(allocation.id);
        }
      }
    } else if (newStatus === "unapproved") {
      // Remove any leave coverage requirements that were created for this leave
      const { data: leave } = await supabase
        .from("leave_periods")
        .select("*")
        .eq("id", leaveId)
        .single();

      if (!leave) return { success: false, error: "Leave period not found" };

      // Find allocations that overlap with this leave period
      const { data: allocations } = await supabase
        .from("project_allocations")
        .select("*")
        .eq("person_id", personId)
        .gte("end_date", leave.start_date)
        .lte("start_date", leave.end_date);

      if (allocations) {
        for (const allocation of allocations) {
          // Find and clean up leave coverage requirements for this allocation
          const { data: leaveReqs } = await supabase
            .from("project_resource_requirements")
            .select("*")
            .eq("auto_generated_type", "leave_coverage")
            .eq("source_allocation_id", allocation.id);

          if (leaveReqs) {
            for (const req of leaveReqs) {
              // Check if this requirement overlaps with the denied leave
              const reqStart = new Date(req.start_date);
              const reqEnd = new Date(req.end_date);
              const leaveStart = new Date(leave.start_date);
              const leaveEnd = new Date(leave.end_date);

              if (reqStart <= leaveEnd && reqEnd >= leaveStart) {
                // Check if it has allocations
                const { data: reqAllocations } = await supabase
                  .from("project_allocations")
                  .select("id")
                  .eq("requirement_id", req.id);

                if (!reqAllocations || reqAllocations.length === 0) {
                  // Safe to delete
                  await supabase
                    .from("project_resource_requirements")
                    .delete()
                    .eq("id", req.id);
                }
              }
            }
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing leave status change:", error);
    return { success: false, error };
  }
}