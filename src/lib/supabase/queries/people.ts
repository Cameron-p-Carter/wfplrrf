import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// People CRUD operations
export async function getPeople(): Promise<Tables<"people_with_roles">[]> {
  try {
    const { data, error } = await supabase
      .from("people_with_roles")
      .select("*")
      .order("name");
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch people");
  }
}

export async function getPersonById(id: string): Promise<Tables<"people">> {
  try {
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "fetch person");
  }
}

export async function createPerson(person: TablesInsert<"people">): Promise<Tables<"people">> {
  try {
    const { data, error } = await supabase
      .from("people")
      .insert(person)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "create person");
  }
}

export async function updatePerson(id: string, person: TablesUpdate<"people">): Promise<Tables<"people">> {
  try {
    const { data, error } = await supabase
      .from("people")
      .update(person)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, "update person");
  }
}

export async function deletePerson(id: string): Promise<void> {
  try {
    // Check if person has active allocations
    const { data: allocations } = await supabase
      .from("project_allocations")
      .select("id", { count: "exact" })
      .eq("person_id", id);

    if ((allocations?.length || 0) > 0) {
      throw new Error("Cannot delete person with active project allocations");
    }

    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, "delete person");
  }
}