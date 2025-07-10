"use client";

import { createCrudHook } from "@/lib/supabase/shared/crud-factory";
import { getRoleTypes, createRoleType, updateRoleType, deleteRoleType } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Create specialized role types hook using the generic CRUD factory
const useRoleTypesCrud = createCrudHook<Tables<"role_types">, TablesInsert<"role_types">, TablesUpdate<"role_types">>(
  "Role type",
  {
    getAll: getRoleTypes,
    create: createRoleType,
    update: updateRoleType,
    delete: deleteRoleType,
  },
  {
    sortBy: "name",
  }
);

export function useRoleTypes() {
  const { items: roleTypes, ...rest } = useRoleTypesCrud();
  return { roleTypes, ...rest };
}
