"use client";

import { createCrudHook } from "@/lib/supabase/shared/crud-factory";
import { getProjects, createProject, updateProject, deleteProject } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Create specialized projects hook using the generic CRUD factory
const useProjectsCrud = createCrudHook<Tables<"projects">, TablesInsert<"projects">, TablesUpdate<"projects">>(
  "Project",
  {
    getAll: getProjects,
    create: createProject,
    update: updateProject,
    delete: deleteProject,
  },
  {
    sortBy: "name",
  }
);

export function useProjects() {
  const { items: projects, ...rest } = useProjectsCrud();
  return { projects, ...rest };
}
