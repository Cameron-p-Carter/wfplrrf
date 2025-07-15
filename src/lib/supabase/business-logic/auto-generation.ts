import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import type { Tables, TablesInsert } from "@/types/supabase";

// Auto-generation functions for requirements
export async function generateLeaveGapRequirements(allocationId: string): Promise<Tables<"project_resource_requirements">[]> {
  try {
    // Get the allocation details with simpler query
    const { data: allocation, error: allocError } = await supabase
      .from("project_allocations")
      .select("*")
      .eq("id", allocationId)
      .single();

    if (allocError) {
      console.error("Error fetching allocation:", allocError);
      throw allocError;
    }
    if (!allocation) {
      console.log("No allocation found for ID:", allocationId);
      return [];
    }

    console.log("Allocation dates - start:", allocation.start_date, "end:", allocation.end_date, "allocationId:", allocationId);

    // Get approved leave periods that overlap with this allocation
    const { data: approvedLeave, error: leaveError } = await supabase
      .from("leave_periods")
      .select("*")
      .eq("person_id", allocation.person_id)
      .eq("status", "approved")
      .gte("end_date", allocation.start_date)
      .lte("start_date", allocation.end_date);

    if (leaveError) {
      console.error("Error fetching leave periods:", leaveError);
      throw leaveError;
    }
    if (!approvedLeave || approvedLeave.length === 0) {
      console.log("No approved leave found for person:", allocation.person_id);
      return [];
    }

    console.log("Found approved leave periods:", approvedLeave.length);
    approvedLeave.forEach(leave => {
      console.log("Leave period - start:", leave.start_date, "end:", leave.end_date);
    });

    // Create leave coverage requirements for each approved leave period
    const newRequirements = [];
    
    for (const leave of approvedLeave) {
      try {
        // Calculate the overlap period between allocation and leave
        const overlapStart = new Date(Math.max(new Date(allocation.start_date).getTime(), new Date(leave.start_date).getTime()));
        const overlapEnd = new Date(Math.min(new Date(allocation.end_date).getTime(), new Date(leave.end_date).getTime()));
        
        if (overlapStart <= overlapEnd) {
          // Calculate the coverage needed (based on allocation percentage)
          const coverageNeeded = allocation.allocation_percentage / 100;
          
          const requirementData: TablesInsert<"project_resource_requirements"> = {
            project_id: allocation.project_id,
            role_type_id: allocation.role_type_id,
            start_date: overlapStart.toISOString().split('T')[0],
            end_date: overlapEnd.toISOString().split('T')[0],
            required_count: coverageNeeded,
            auto_generated_type: 'leave_coverage' as const,
            source_allocation_id: allocation.id,
            parent_requirement_id: allocation.requirement_id
          };

          console.log("Creating leave coverage requirement:", requirementData);

          const { data: newReq, error: createError } = await supabase
            .from("project_resource_requirements")
            .insert(requirementData)
            .select()
            .single();

          if (createError) {
            console.error("Error creating leave coverage requirement:", createError);
            throw createError;
          }
          newRequirements.push(newReq);
        }
      } catch (leaveProcessError) {
        console.error("Error processing leave period:", leave.id, leaveProcessError);
        // Continue with other leave periods instead of failing completely
      }
    }

    console.log("Created leave coverage requirements:", newRequirements.length);
    return newRequirements;
  } catch (error) {
    console.error("Error in generateLeaveGapRequirements:", error);
    return []; // Return empty array instead of throwing to prevent blocking allocation creation
  }
}

export async function generatePartialAllocationGaps(allocationId: string): Promise<Tables<"project_resource_requirements">[]> {
  try {
    // Get the allocation details with simpler query
    const { data: allocation, error: allocError } = await supabase
      .from("project_allocations")
      .select("*")
      .eq("id", allocationId)
      .single();

    if (allocError) {
      console.error("Error fetching allocation for partial gap:", allocError);
      throw allocError;
    }
    if (!allocation || !allocation.requirement_id) {
      console.log("No allocation or requirement_id found for partial gap:", allocationId);
      return [];
    }

    // Get the parent requirement
    const { data: requirement, error: reqError } = await supabase
      .from("project_resource_requirements")
      .select("*")
      .eq("id", allocation.requirement_id)
      .single();

    if (reqError) {
      console.error("Error fetching parent requirement:", reqError);
      throw reqError;
    }
    if (!requirement || requirement.auto_generated_type) {
      console.log("Parent requirement is auto-generated, skipping partial gap creation");
      return []; // Don't create gaps for auto-generated requirements
    }

    // Check if this allocation is less than 100%
    if (allocation.allocation_percentage >= 100) {
      console.log("Allocation is 100%, no partial gap needed");
      return [];
    }

    // Calculate the gap - this should be the remaining amount needed to fulfill the requirement
    const gapPercentage = 100 - allocation.allocation_percentage;
    const gapAmount = gapPercentage / 100;

    console.log("Creating partial gap for", gapPercentage, "% (", gapAmount, "person) for allocation:", allocation.id);

    // Check if a partial gap requirement already exists for this allocation
    const { data: existingGap } = await supabase
      .from("project_resource_requirements")
      .select("*")
      .eq("auto_generated_type", "partial_gap")
      .eq("source_allocation_id", allocation.id);

    if (existingGap && existingGap.length > 0) {
      console.log("Partial gap already exists");
      return existingGap; // Gap already exists
    }

    // Create the partial gap requirement
    const requirementData: TablesInsert<"project_resource_requirements"> = {
      project_id: allocation.project_id,
      role_type_id: allocation.role_type_id,
      start_date: allocation.start_date,
      end_date: allocation.end_date,
      required_count: gapAmount,
      auto_generated_type: 'partial_gap' as const,
      source_allocation_id: allocation.id,
      parent_requirement_id: allocation.requirement_id
    };

    console.log("Creating partial gap requirement:", requirementData);

    const { data: newReq, error: createError } = await supabase
      .from("project_resource_requirements")
      .insert(requirementData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating partial gap requirement:", createError);
      throw createError;
    }
    
    console.log("Created partial gap requirement:", newReq.id);
    return [newReq];
  } catch (error) {
    console.error("Error in generatePartialAllocationGaps:", error);
    return []; // Return empty array instead of throwing to prevent blocking allocation creation
  }
}

export async function cleanupAutoGeneratedRequirements(allocationId: string): Promise<void> {
  try {
    // Get all auto-generated requirements linked to this allocation
    const { data: autoGenerated, error } = await supabase
      .from("project_resource_requirements")
      .select("*")
      .eq("source_allocation_id", allocationId)
      .not("auto_generated_type", "is", null);

    if (error) throw error;
    if (!autoGenerated || autoGenerated.length === 0) return;

    // For each auto-generated requirement, check if it has any allocations
    for (const req of autoGenerated) {
      const { data: allocations } = await supabase
        .from("project_allocations")
        .select("id")
        .eq("requirement_id", req.id);

      if (!allocations || allocations.length === 0) {
        // No allocations, safe to delete
        await supabase
          .from("project_resource_requirements")
          .delete()
          .eq("id", req.id);
      }
      // If there are allocations, keep the requirement but it becomes an "over-allocation"
    }
  } catch (error) {
    handleDatabaseError(error, "cleanup auto-generated requirements");
  }
}

export async function processAllocationAutoGeneration(allocationId: string): Promise<any> {
  try {
    // Clean up any existing auto-generated requirements for this allocation
    await cleanupAutoGeneratedRequirements(allocationId);
    
    // Generate new requirements
    const leaveGaps = await generateLeaveGapRequirements(allocationId);
    const partialGaps = await generatePartialAllocationGaps(allocationId);
    
    return {
      leaveGaps,
      partialGaps,
      success: true
    };
  } catch (error) {
    console.error("Error in auto-generation:", error);
    return {
      leaveGaps: [],
      partialGaps: [],
      success: false,
      error
    };
  }
}