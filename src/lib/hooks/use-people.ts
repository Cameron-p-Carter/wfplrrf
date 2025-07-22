"use client";

import { createCrudHook } from "@/lib/supabase/shared/crud-factory";
import { getPeople, createPerson, updatePerson, deletePerson } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Create specialized people hook using the generic CRUD factory
// Note: Using refetchOnCreateUpdate because we need to get the updated view with role info
const usePeopleCrud = createCrudHook<Tables<"people_with_roles"> & { id: string }, TablesInsert<"people">, TablesUpdate<"people">>(
  "Person",
  {
    getAll: getPeople as any, // Type cast needed due to view nullable id vs constraint
    create: createPerson as any, // Type cast needed due to view vs table mismatch
    update: updatePerson as any,
    delete: deletePerson,
  },
  {
    sortBy: "name",
    refetchOnCreateUpdate: true, // Needed to get updated view with role info
  }
);

export function usePeople() {
  const { items: people, ...rest } = usePeopleCrud();
  return { people, ...rest };
}
