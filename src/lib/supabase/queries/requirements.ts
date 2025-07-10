import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Project Resource Requirements CRUD operations
export async function getProjectRequirements(projectId: string): Promise<Tables<"project_requirements_detailed">[]> {
  try {
    const { data, error } = await supabase
      .from("project_requirements_detailed")
      .select("*")
      .eq("project_id", projectId)
      .order("start_date");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch project requirements");
  }
}

export async function getGroupedProjectRequirements(projectId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("project_requirements_detailed")
      .select("*")
      .eq("project_id", projectId)
      .order("start_date");
    
    if (error) throw error;
    if (!data) return [];

    // Group requirements by parent-child relationships
    const parentRequirements = data.filter(req => !req.parent_requirement_id);
    const childRequirements = data.filter(req => req.parent_requirement_id);

    // Create grouped structure
    const groupedRequirements = parentRequirements.map(parent => ({
      ...parent,
      children: childRequirements.filter(child => child.parent_requirement_id === parent.id)
    }));

    // Add orphaned auto-generated requirements (those without valid parents)
    const orphanedChildren = childRequirements.filter(child => 
      !parentRequirements.find(parent => parent.id === child.parent_requirement_id)
    );

    return [...groupedRequirements, ...orphanedChildren.map(child => ({ ...child, children: [] }))];
  } catch (error) {
    handleDatabaseError(error, "fetch grouped project requirements");
  }
}

export async function getProjectRequirementById(id: string): Promise<Tables<"project_resource_requirements">> {
  try {
    const { data, error } = await supabase
      .from("project_resource_requirements")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch project requirement");
  }
}

export async function createProjectRequirement(requirement: TablesInsert<"project_resource_requirements">): Promise<Tables<"project_resource_requirements">> {
  try {
    const { data, error } = await supabase
      .from("project_resource_requirements")
      .insert(requirement)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "create project requirement");
  }
}

export async function updateProjectRequirement(id: string, requirement: TablesUpdate<"project_resource_requirements">): Promise<Tables<"project_resource_requirements">> {
  try {
    const { data, error } = await supabase
      .from("project_resource_requirements")
      .update(requirement)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "update project requirement");
  }
}

export async function deleteProjectRequirement(id: string): Promise<void> {
  try {
    // First, delete all auto-generated child requirements that have this requirement as their parent
    const { error: childDeleteError } = await supabase
      .from("project_resource_requirements")
      .delete()
      .eq("parent_requirement_id", id)
      .not("auto_generated_type", "is", null);

    if (childDeleteError) {
      console.error("Error deleting child requirements:", childDeleteError);
      throw childDeleteError;
    }

    // Set requirement_id to null for any allocations linked to this requirement
    // This makes them "orphaned" allocations that can be cleaned up later
    const { error: orphanError } = await supabase
      .from("project_allocations")
      .update({ requirement_id: null })
      .eq("requirement_id", id);

    if (orphanError) {
      console.error("Error orphaning allocations:", orphanError);
      throw orphanError;
    }

    // Then delete the parent requirement itself
    const { error } = await supabase
      .from("project_resource_requirements")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, "delete project requirement");
  }
}