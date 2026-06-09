"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getAllContracts,
  getPersonContracts,
  createContract,
  updateContract,
  deleteContract,
  type Contract,
  type ContractWithPerson,
  type ContractInsert,
  type ContractUpdate,
} from "@/lib/supabase";

export function useContracts(personId?: string) {
  const [contracts, setContracts] = useState<Contract[] | ContractWithPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = personId
        ? await getPersonContracts(personId)
        : await getAllContracts();
      setContracts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch contracts";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [personId]);

  const create = async (contract: ContractInsert) => {
    try {
      await createContract(contract);
      await fetchContracts();
      toast.success("Contract created successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create contract";
      toast.error(message);
      throw err;
    }
  };

  const update = async (id: string, contract: ContractUpdate) => {
    try {
      await updateContract(id, contract);
      await fetchContracts();
      toast.success("Contract updated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update contract";
      toast.error(message);
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteContract(id);
      setContracts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contract deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete contract";
      toast.error(message);
      throw err;
    }
  };

  return { contracts, loading, error, create, update, remove, refetch: fetchContracts };
}
