"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  getProjectRequirements, 
  getGroupedProjectRequirements,
  createProjectRequirement, 
  updateProjectRequirement, 
  deleteProjectRequirement,
  ignoreProjectRequirement,
  unIgnoreProjectRequirement
} from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

interface GroupedRequirement extends Tables<"project_requirements_detailed"> {
  children: Tables<"project_requirements_detailed">[];
}

export function useProjectRequirements(projectId: string) {
  const [requirements, setRequirements] = useState<Tables<"project_requirements_detailed">[]>([]);
  const [groupedRequirements, setGroupedRequirements] = useState<GroupedRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirements = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);
      const [data, groupedData] = await Promise.all([
        getProjectRequirements(projectId),
        getGroupedProjectRequirements(projectId)
      ]);
      setRequirements(data);
      setGroupedRequirements(groupedData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch project requirements";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [projectId]);

  const create = async (requirement: TablesInsert<"project_resource_requirements">) => {
    try {
      await createProjectRequirement(requirement);
      await fetchRequirements(); // Refetch to get the updated view with role info
      toast.success("Resource requirement created successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create resource requirement";
      toast.error(message);
      throw err;
    }
  };

  const update = async (id: string, requirement: TablesUpdate<"project_resource_requirements">) => {
    try {
      await updateProjectRequirement(id, requirement);
      await fetchRequirements(); // Refetch to get the updated view with role info
      toast.success("Resource requirement updated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update resource requirement";
      toast.error(message);
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteProjectRequirement(id);
      await fetchRequirements(); // Refetch to get the updated view and handle cascading deletions
      toast.success("Resource requirement deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete resource requirement";
      toast.error(message);
      throw err;
    }
  };

  const ignore = async (id: string) => {
    try {
      await ignoreProjectRequirement(id);
      await fetchRequirements(); // Refetch to get the updated view
      toast.success("Resource requirement ignored successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to ignore resource requirement";
      toast.error(message);
      throw err;
    }
  };

  const unIgnore = async (id: string) => {
    try {
      await unIgnoreProjectRequirement(id);
      await fetchRequirements(); // Refetch to get the updated view
      toast.success("Resource requirement restored successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to restore resource requirement";
      toast.error(message);
      throw err;
    }
  };

  return {
    requirements,
    groupedRequirements,
    loading,
    error,
    create,
    update,
    remove,
    ignore,
    unIgnore,
    refetch: fetchRequirements,
  };
}
