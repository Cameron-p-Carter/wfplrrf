"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  getPersonLeave,
  getAllLeave,
  getPendingLeave,
  createLeavePeriod, 
  updateLeavePeriod, 
  updateLeaveStatus,
  deleteLeavePeriod,
  processLeaveCreationForExistingAllocations,
  processLeaveDeletionForExistingAllocations,
  processLeaveStatusChange
} from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

type LeaveWithPerson = Tables<"leave_periods"> & {
  people: {
    id: string;
    name: string;
    role_types: { name: string } | null;
  };
};

export function useLeavePeriods(personId?: string) {
  const [leavePeriods, setLeavePeriods] = useState<Tables<"leave_periods">[] | LeaveWithPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeavePeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (personId) {
        data = await getPersonLeave(personId);
      } else {
        data = await getAllLeave();
      }
      
      setLeavePeriods(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch leave periods";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeavePeriods();
  }, [personId]);

  const create = async (leave: TablesInsert<"leave_periods">) => {
    try {
      await createLeavePeriod(leave);
      await fetchLeavePeriods();
      toast.success("Leave period created successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create leave period";
      toast.error(message);
      throw err;
    }
  };

  const update = async (id: string, leave: TablesUpdate<"leave_periods">) => {
    try {
      await updateLeavePeriod(id, leave);
      await fetchLeavePeriods();
      toast.success("Leave period updated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update leave period";
      toast.error(message);
      throw err;
    }
  };

  const updateStatus = async (id: string, status: "pending" | "approved" | "unapproved") => {
    try {
      await updateLeaveStatus(id, status);
      await fetchLeavePeriods();
      toast.success(`Leave ${status} successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update leave status";
      toast.error(message);
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteLeavePeriod(id);
      setLeavePeriods(prev => prev.filter(leave => leave.id !== id));
      toast.success("Leave period deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete leave period";
      toast.error(message);
      throw err;
    }
  };

  return {
    leavePeriods,
    loading,
    error,
    create,
    update,
    updateStatus,
    remove,
    refetch: fetchLeavePeriods,
  };
}

export function usePendingLeave() {
  const [pendingLeave, setPendingLeave] = useState<LeaveWithPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingLeave = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingLeave();
      setPendingLeave(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch pending leave";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLeave();
  }, []);

  const approveLeave = async (id: string) => {
    try {
      await updateLeaveStatus(id, "approved");
      await fetchPendingLeave();
      toast.success("Leave approved successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve leave";
      toast.error(message);
      throw err;
    }
  };

  const rejectLeave = async (id: string) => {
    try {
      await updateLeaveStatus(id, "unapproved");
      await fetchPendingLeave();
      toast.success("Leave rejected successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reject leave";
      toast.error(message);
      throw err;
    }
  };

  return {
    pendingLeave,
    loading,
    error,
    approveLeave,
    rejectLeave,
    refetch: fetchPendingLeave,
  };
}
