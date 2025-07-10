import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Projects CRUD operations
export async function getProjects(): Promise<Tables<"projects">[]> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("name");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch projects");
  }
}

export async function getProjectById(id: string): Promise<Tables<"projects">> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch project");
  }
}

export async function createProject(project: TablesInsert<"projects">): Promise<Tables<"projects">> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .insert(project)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "create project");
  }
}

export async function updateProject(id: string, project: TablesUpdate<"projects">): Promise<Tables<"projects">> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .update(project)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "update project");
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    // Check if project has active allocations or requirements
    const { data: allocations } = await supabase
      .from("project_allocations")
      .select("id", { count: "exact" })
      .eq("project_id", id);

    const { data: requirements } = await supabase
      .from("project_resource_requirements")
      .select("id", { count: "exact" })
      .eq("project_id", id);

    if ((allocations?.length || 0) > 0 || (requirements?.length || 0) > 0) {
      throw new Error("Cannot delete project with active allocations or resource requirements");
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, "delete project");
  }
}