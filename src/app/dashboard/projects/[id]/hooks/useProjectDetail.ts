import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjectById } from "@/lib/supabase";
import { useProjectRequirements } from "@/lib/hooks/use-project-requirements";
import { useProjectAllocations } from "@/lib/hooks/use-project-allocations";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

interface GroupedRequirement extends Tables<"project_requirements_detailed"> {
  children?: Tables<"project_requirements_detailed">[];
}

interface Gap {
  role_type_name: string;
  required_count: number;
  allocated_count: number;
  gap_count: number;
  start_date: string;
  end_date: string;
}

interface UseProjectDetailReturn {
  project: Tables<"projects"> | null;
  loading: boolean;
  error: string | null;
  getProjectStatus: (project: Tables<"projects">) => { label: string; variant: "secondary" | "outline" | "default" };
  requirements: Tables<"project_requirements_detailed">[];
  groupedRequirements: GroupedRequirement[];
  allocations: Tables<"project_allocations_detailed">[];
  gaps: Gap[];
  requirementsLoading: boolean;
  allocationsLoading: boolean;
  refetchRequirements: () => Promise<void>;
  refetchAllocations: () => Promise<void>;
  create: (data: TablesInsert<"project_resource_requirements">) => Promise<void>;
  update: (id: string, data: TablesUpdate<"project_resource_requirements">) => Promise<void>;
  remove: (id: string) => Promise<void>;
  ignore: (id: string) => Promise<void>;
  unIgnore: (id: string) => Promise<void>;
  createAllocation: (data: TablesInsert<"project_allocations">) => Promise<void>;
  updateAllocation: (id: string, data: TablesUpdate<"project_allocations">) => Promise<void>;
  removeAllocation: (id: string) => Promise<void>;
}

export function useProjectDetail(projectId: string): UseProjectDetailReturn {
  const router = useRouter();
  const [project, setProject] = useState<Tables<"projects"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use existing hooks for requirements and allocations
  const { 
    requirements, 
    groupedRequirements, 
    loading: requirementsLoading, 
    create, 
    update, 
    remove,
    ignore,
    unIgnore,
    refetch: refetchRequirements 
  } = useProjectRequirements(projectId);
  
  const { 
    allocations, 
    gaps, 
    loading: allocationsLoading, 
    create: createAllocation, 
    update: updateAllocation, 
    remove: removeAllocation, 
    refetch: refetchAllocations 
  } = useProjectAllocations(projectId);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await getProjectById(projectId);
        setProject(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch project";
        setError(message);
        console.error("Failed to fetch project:", err);
        router.push("/dashboard/projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, router]);

  const getProjectStatus = (project: Tables<"projects">) => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (now < startDate) {
      return { label: "Not Started", variant: "secondary" as const };
    } else if (now > endDate) {
      return { label: "Completed", variant: "outline" as const };
    } else {
      return { label: "In Progress", variant: "default" as const };
    }
  };

  return {
    project,
    loading,
    error,
    getProjectStatus,
    requirements,
    groupedRequirements,
    allocations,
    gaps,
    requirementsLoading,
    allocationsLoading,
    refetchRequirements,
    refetchAllocations,
    create,
    update,
    remove,
    ignore,
    unIgnore,
    createAllocation,
    updateAllocation,
    removeAllocation,
  };
}