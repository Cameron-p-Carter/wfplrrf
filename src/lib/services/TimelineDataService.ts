import type { Tables } from "@/types/supabase";
import type { RequirementWithAllocations, RequirementPosition } from "@/components/ui/timeline/types";

/**
 * Service for handling timeline data transformations and business logic
 */
export class TimelineDataService {
  /**
   * Groups allocations by requirement and creates nested structure with positions from grouped requirements
   */
  static generateRequirementsWithAllocations(
    groupedRequirements: (Tables<"project_requirements_detailed"> & { children?: Tables<"project_requirements_detailed">[] })[],
    allocations: Tables<"project_allocations_detailed">[]
  ): RequirementWithAllocations[] {
    const requirementsWithAllocations: RequirementWithAllocations[] = [];
    
    if (!groupedRequirements || !allocations) {
      return requirementsWithAllocations;
    }
    
    groupedRequirements.forEach(parentReq => {
      if (!parentReq.start_date || !parentReq.end_date || !parentReq.role_type_name) return;
      
      // Find allocations that are directly linked to this requirement
      const relatedAllocations = allocations.filter(alloc => 
        alloc.requirement_id === parentReq.id
      );

      const requiredCount = parentReq.required_count || 1;
      const positions: RequirementPosition[] = [];
      
      // Create individual positions for each required count
      for (let i = 0; i < requiredCount; i++) {
        const positionId = `req-${parentReq.id}-${i}`;
        
        // Try to assign an allocation to this position
        const allocation = relatedAllocations[i]; // Simple assignment for now
        
        positions.push({
          id: positionId,
          requirementId: parentReq.id!,
          positionIndex: i,
          roleTypeName: parentReq.role_type_name,
          startDate: new Date(parentReq.start_date),
          endDate: new Date(parentReq.end_date),
          allocatedPerson: allocation ? {
            id: allocation.person_id!,
            name: allocation.person_name!,
            allocationPercentage: allocation.allocation_percentage || 0,
            allocationId: allocation.id!,
            allocationStartDate: new Date(allocation.start_date || ''),
            allocationEndDate: new Date(allocation.end_date || '')
          } : undefined,
          requirement: parentReq
        });
      }

      // Create the parent requirement with allocations
      const parentWithAllocations: RequirementWithAllocations = {
        id: parentReq.id!,
        requirement: parentReq,
        allocations: relatedAllocations,
        positions,
        children: []
      };

      // Add child requirements if they exist
      if (parentReq.children && parentReq.children.length > 0) {
        parentReq.children.forEach(childReq => {
          if (!childReq.start_date || !childReq.end_date || !childReq.role_type_name) return;
          
          // Find allocations for this child requirement
          const childAllocations = allocations.filter(alloc => 
            alloc.requirement_id === childReq.id
          );

          const childRequiredCount = childReq.required_count || 1;
          const childPositions: RequirementPosition[] = [];
          
          // Create positions for child requirement
          for (let i = 0; i < childRequiredCount; i++) {
            const positionId = `req-${childReq.id}-${i}`;
            const allocation = childAllocations[i];
            
            childPositions.push({
              id: positionId,
              requirementId: childReq.id!,
              positionIndex: i,
              roleTypeName: childReq.role_type_name,
              startDate: new Date(childReq.start_date),
              endDate: new Date(childReq.end_date),
              allocatedPerson: allocation ? {
                id: allocation.person_id!,
                name: allocation.person_name!,
                allocationPercentage: allocation.allocation_percentage || 0,
                allocationId: allocation.id!,
                allocationStartDate: new Date(allocation.start_date || ''),
                allocationEndDate: new Date(allocation.end_date || '')
              } : undefined,
              requirement: childReq
            });
          }

          parentWithAllocations.children!.push({
            id: childReq.id!,
            requirement: childReq,
            allocations: childAllocations,
            positions: childPositions
          });
        });
      }

      requirementsWithAllocations.push(parentWithAllocations);
    });
    
    // Add orphaned allocations (allocations with no requirement)
    const orphanedAllocations = allocations.filter(alloc => !alloc.requirement_id);
    
    if (orphanedAllocations.length > 0) {
      const orphanedPositions: RequirementPosition[] = orphanedAllocations.map((allocation, index) => ({
        id: `orphan-${allocation.id}`,
        requirementId: 'orphaned',
        positionIndex: index,
        roleTypeName: allocation.role_type_name || 'Unknown Role',
        startDate: new Date(allocation.start_date || ''),
        endDate: new Date(allocation.end_date || ''),
        allocatedPerson: {
          id: allocation.person_id!,
          name: allocation.person_name!,
          allocationPercentage: allocation.allocation_percentage || 0,
          allocationId: allocation.id!,
          allocationStartDate: new Date(allocation.start_date || ''),
          allocationEndDate: new Date(allocation.end_date || '')
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
      // Height for parent requirement
      const parentBlockHeight = Math.max(80, req.positions.length * 40 + 30);
      let totalHeight = parentBlockHeight;
      
      // Add height for child requirements with proper spacing
      if (req.children && req.children.length > 0) {
        const childrenHeight = req.children.reduce((childAcc, child) => {
          const childBlockHeight = Math.max(60, child.positions.length * 30 + 20);
          return childAcc + childBlockHeight + 24; // 24px margin between children
        }, 0);
        totalHeight += childrenHeight + 32; // Extra 32px spacing after parent
      }
      
      return acc + totalHeight + 48; // 48px margin between requirement groups (increased from 32px)
    }, 0);
  }
}