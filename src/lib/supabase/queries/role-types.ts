import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Role Types CRUD operations
export async function getRoleTypes(): Promise<Tables<"role_types">[]> {
  try {
    const { data, error } = await supabase
      .from("role_types")
      .select("*")
      .order("name");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch role types");
  }
}

export async function getRoleTypeById(id: string): Promise<Tables<"role_types">> {
  try {
    const { data, error } = await supabase
      .from("role_types")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch role type");
  }
}

export async function createRoleType(roleType: TablesInsert<"role_types">): Promise<Tables<"role_types">> {
  try {
    const { data, error } = await supabase
      .from("role_types")
      .insert(roleType)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "create role type");
  }
}

export async function updateRoleType(id: string, roleType: TablesUpdate<"role_types">): Promise<Tables<"role_types">> {
  try {
    const { data, error } = await supabase
      .from("role_types")
      .update(roleType)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "update role type");
  }
}

export async function deleteRoleType(id: string): Promise<void> {
  try {
    // Check if role type is in use
    const { data: peopleCount } = await supabase
      .from("people")
      .select("id", { count: "exact" })
      .eq("role_type_id", id);

    const { data: requirementsCount } = await supabase
      .from("project_resource_requirements")
      .select("id", { count: "exact" })
      .eq("role_type_id", id);

    if ((peopleCount?.length || 0) > 0 || (requirementsCount?.length || 0) > 0) {
      throw new Error("Cannot delete role type that is currently in use");
    }

    const { error } = await supabase
      .from("role_types")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, "delete role type");
  }
}