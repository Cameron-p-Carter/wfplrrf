import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import { getProjectRequirements } from "../queries/requirements";
import { getProjectAllocations } from "../queries/allocations";

// Gap analysis business logic
export interface ProjectGap {
  requirement_id: string;
  role_type_id: string;
  role_type_name: string;
  required_count: number;
  allocated_count: number;
  gap_count: number;
  start_date: string;
  end_date: string;
}

export async function getProjectGaps(projectId: string): Promise<ProjectGap[]> {
  try {
    // Get requirements
    const requirements = await getProjectRequirements(projectId);
    
    // Get allocations
    const allocations = await getProjectAllocations(projectId);
    
    // Calculate gaps
    const gaps: ProjectGap[] = [];
    
    for (const requirement of requirements) {
      if (!requirement.start_date || !requirement.end_date || !requirement.role_type_id) continue;
      
      // Find allocations that are directly linked to this requirement
      const directAllocations = allocations.filter(allocation => 
        allocation.requirement_id === requirement.id
      );
      
      // Also find legacy allocations (without requirement_id) that overlap with this requirement
      // This ensures backward compatibility with existing data
      const legacyAllocations = allocations.filter(allocation => 
        !allocation.requirement_id && // No requirement_id set (legacy allocation)
        allocation.role_type_id === requirement.role_type_id &&
        allocation.start_date && allocation.end_date &&
        new Date(allocation.start_date) <= new Date(requirement.end_date || '') &&
        new Date(allocation.end_date) >= new Date(requirement.start_date || '')
      );
      
      // Combine direct and legacy allocations
      const matchingAllocations = [...directAllocations, ...legacyAllocations];
      
      // Calculate allocated count (sum of allocation percentages / 100)
      const allocatedCount = matchingAllocations.reduce((sum, allocation) => 
        sum + (allocation.allocation_percentage || 0) / 100, 0
      );
      
      const gap = (requirement.required_count || 0) - allocatedCount;
      
      if (gap > 0) {
        gaps.push({
          requirement_id: requirement.id!,
          role_type_id: requirement.role_type_id!,
          role_type_name: requirement.role_type_name!,
          required_count: requirement.required_count || 0,
          allocated_count: allocatedCount,
          gap_count: gap,
          start_date: requirement.start_date,
          end_date: requirement.end_date,
        });
      }
    }
    
    return gaps;
  } catch (error) {
    handleDatabaseError(error, "calculate project gaps");
  }
}

export async function getAllProjectGaps(): Promise<{ projectId: string; gaps: ProjectGap[] }[]> {
  try {
    // Get all projects
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id");
    
    if (error) throw error;
    
    const projectGaps = [];
    
    for (const project of projects) {
      const gaps = await getProjectGaps(project.id);
      if (gaps.length > 0) {
        projectGaps.push({
          projectId: project.id,
          gaps
        });
      }
    }
    
    return projectGaps;
  } catch (error) {
    handleDatabaseError(error, "get all project gaps");
  }
}

export async function getGapsByRoleType(roleTypeId: string): Promise<ProjectGap[]> {
  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id");
    
    if (error) throw error;
    
    const roleTypeGaps = [];
    
    for (const project of projects) {
      const gaps = await getProjectGaps(project.id);
      const roleGaps = gaps.filter(gap => gap.role_type_id === roleTypeId);
      roleTypeGaps.push(...roleGaps);
    }
    
    return roleTypeGaps;
  } catch (error) {
    handleDatabaseError(error, "get gaps by role type");
  }
}

export async function getGapSummary(): Promise<{
  totalGaps: number;
  gapsByRole: { roleTypeId: string; roleTypeName: string; totalGap: number }[];
  criticalGaps: ProjectGap[];
}> {
  try {
    const allGaps = await getAllProjectGaps();
    const flatGaps = allGaps.flatMap(pg => pg.gaps);
    
    // Group by role type
    const roleGaps = new Map<string, { roleTypeName: string; totalGap: number }>();
    
    for (const gap of flatGaps) {
      const existing = roleGaps.get(gap.role_type_id) || { roleTypeName: gap.role_type_name, totalGap: 0 };
      existing.totalGap += gap.gap_count;
      roleGaps.set(gap.role_type_id, existing);
    }
    
    // Find critical gaps (gaps > 2 people or urgent timeline)
    const criticalGaps = flatGaps.filter(gap => 
      gap.gap_count > 2 || 
      new Date(gap.start_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Within 30 days
    );
    
    return {
      totalGaps: flatGaps.length,
      gapsByRole: Array.from(roleGaps.entries()).map(([roleTypeId, data]) => ({
        roleTypeId,
        roleTypeName: data.roleTypeName,
        totalGap: data.totalGap
      })),
      criticalGaps
    };
  } catch (error) {
    handleDatabaseError(error, "get gap summary");
  }
}