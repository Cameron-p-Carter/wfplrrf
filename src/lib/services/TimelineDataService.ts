import type { Tables } from "@/types/supabase";
import type { RequirementWithAllocations, RequirementPosition } from "@/components/ui/timeline/types";

/**
 * Service for handling timeline data transformations and business logic
 */
export class TimelineDataService {
  /**
   * Groups allocations by requirement and creates nested structure with positions
   */
  static generateRequirementsWithAllocations(
    requirements: Tables<"project_requirements_detailed">[],
    allocations: Tables<"project_allocations_detailed">[]
  ): RequirementWithAllocations[] {
    const requirementsWithAllocations: RequirementWithAllocations[] = [];
    
    if (!requirements || !allocations) {
      return requirementsWithAllocations;
    }
    
    requirements.forEach(req => {
      if (!req.start_date || !req.end_date || !req.role_type_name) return;
      
      // Find allocations that are directly linked to this requirement
      const relatedAllocations = allocations.filter(alloc => 
        alloc.requirement_id === req.id
      );

      const requiredCount = req.required_count || 1;
      const positions: RequirementPosition[] = [];
      
      // Create individual positions for each required count
      for (let i = 0; i < requiredCount; i++) {
        const positionId = `req-${req.id}-${i}`;
        
        // Try to assign an allocation to this position
        const allocation = relatedAllocations[i]; // Simple assignment for now
        
        positions.push({
          id: positionId,
          requirementId: req.id!,
          positionIndex: i,
          roleTypeName: req.role_type_name,
          startDate: new Date(req.start_date),
          endDate: new Date(req.end_date),
          allocatedPerson: allocation ? {
            id: allocation.person_id!,
            name: allocation.person_name!,
            allocationPercentage: allocation.allocation_percentage || 0,
            allocationId: allocation.id!,
            allocationStartDate: new Date(allocation.start_date!),
            allocationEndDate: new Date(allocation.end_date!)
          } : undefined,
          requirement: req
        });
      }

      requirementsWithAllocations.push({
        id: req.id!,
        requirement: req,
        allocations: relatedAllocations,
        positions
      });
    });
    
    // Add orphaned allocations (allocations with no requirement)
    const orphanedAllocations = allocations.filter(alloc => !alloc.requirement_id);
    
    if (orphanedAllocations.length > 0) {
      const orphanedPositions: RequirementPosition[] = orphanedAllocations.map((allocation, index) => ({
        id: `orphan-${allocation.id}`,
        requirementId: 'orphaned',
        positionIndex: index,
        roleTypeName: allocation.role_type_name || 'Unknown Role',
        startDate: new Date(allocation.start_date!),
        endDate: new Date(allocation.end_date!),
        allocatedPerson: {
          id: allocation.person_id!,
          name: allocation.person_name!,
          allocationPercentage: allocation.allocation_percentage || 0,
          allocationId: allocation.id!,
          allocationStartDate: new Date(allocation.start_date!),
          allocationEndDate: new Date(allocation.end_date!)
        },
        requirement: {
          id: 'orphaned',
          role_type_name: allocation.role_type_name,
          start_date: allocation.start_date,
          end_date: allocation.end_date,
          required_count: 1,
          project_id: allocation.project_id,
          role_type_id: allocation.role_type_id,
          auto_generated_type: null,
          parent_requirement_id: null,
          source_allocation_id: null,
          created_at: null,
          updated_at: null,
          project_name: null
        }
      }));

      requirementsWithAllocations.push({
        id: 'orphaned',
        requirement: {
          id: 'orphaned',
          role_type_name: 'Orphaned Allocations',
          start_date: orphanedAllocations[0]?.start_date || '',
          end_date: orphanedAllocations[0]?.end_date || '',
          required_count: orphanedAllocations.length,
          project_id: orphanedAllocations[0]?.project_id || '',
          role_type_id: orphanedAllocations[0]?.role_type_id || '',
          auto_generated_type: null,
          parent_requirement_id: null,
          source_allocation_id: null,
          created_at: null,
          updated_at: null,
          project_name: null
        },
        allocations: orphanedAllocations,
        positions: orphanedPositions
      });
    }
    
    return requirementsWithAllocations;
  }

  /**
   * Calculate where allocation should appear within the requirement box
   */
  static calculateAllocationOffset(
    position: RequirementPosition,
    requirementPosition: { left: number; width: number }
  ): number {
    if (!position.allocatedPerson) return 0;
    
    const reqStart = position.startDate.getTime();
    const reqEnd = position.endDate.getTime();
    const allocStart = position.allocatedPerson.allocationStartDate.getTime();
    
    const reqDuration = reqEnd - reqStart;
    const offsetFromStart = Math.max(0, allocStart - reqStart);
    
    return (offsetFromStart / reqDuration) * requirementPosition.width;
  }

  /**
   * Calculate the width of the allocation bar within the requirement
   */
  static calculateAllocationWidth(
    position: RequirementPosition,
    requirementPosition: { left: number; width: number }
  ): number {
    if (!position.allocatedPerson) return 0;
    
    const reqStart = position.startDate.getTime();
    const reqEnd = position.endDate.getTime();
    const allocStart = position.allocatedPerson.allocationStartDate.getTime();
    const allocEnd = position.allocatedPerson.allocationEndDate.getTime();
    
    const reqDuration = reqEnd - reqStart;
    const allocDuration = Math.min(allocEnd, reqEnd) - Math.max(allocStart, reqStart);
    
    return Math.max(20, (allocDuration / reqDuration) * requirementPosition.width);
  }

  /**
   * Calculate total height needed for the timeline
   */
  static calculateTotalHeight(requirementsWithAllocations: RequirementWithAllocations[]): number {
    if (!requirementsWithAllocations) {
      return 0;
    }
    
    return requirementsWithAllocations.reduce((acc, req) => {
      const blockHeight = Math.max(60, req.positions.length * 30 + 20);
      return acc + blockHeight + 32; // 32px margin (mb-8)
    }, 0);
  }
}