import { supabase } from "../shared/base-queries";
import { handleDatabaseError } from "../shared/error-handling";

export type ContractType = "permanent" | "contractor" | "fixed_term";
export type ContractStatus = "active" | "expired" | "renewed" | "cancelled";

export type Contract = {
  id: string;
  person_id: string;
  contract_type: ContractType;
  status: ContractStatus;
  start_date: string;
  end_date: string | null;
  length_months: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ContractWithPerson = Contract & {
  people: {
    id: string;
    display_name: string;
    role_type_name?: string | null;
  };
};

export type ContractInsert = Omit<Contract, "id" | "created_at" | "updated_at">;
export type ContractUpdate = Partial<ContractInsert>;

export async function getAllContracts(): Promise<ContractWithPerson[]> {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        *,
        people!inner(
          id,
          display_name
        )
      `)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return data as ContractWithPerson[];
  } catch (error) {
    handleDatabaseError(error, "fetch contracts");
  }
}

export async function getPersonContracts(personId: string): Promise<Contract[]> {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("person_id", personId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return data as Contract[];
  } catch (error) {
    handleDatabaseError(error, "fetch person contracts");
  }
}

export async function createContract(contract: ContractInsert): Promise<Contract> {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .insert(contract)
      .select()
      .single();

    if (error) throw error;
    return data as Contract;
  } catch (error) {
    handleDatabaseError(error, "create contract");
  }
}

export async function updateContract(id: string, contract: ContractUpdate): Promise<Contract> {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .update(contract)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Contract;
  } catch (error) {
    handleDatabaseError(error, "update contract");
  }
}

export async function deleteContract(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, "delete contract");
  }
}

export async function checkPersonContractCoverage(
  personId: string,
  startDate: string,
  endDate: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("id")
      .eq("person_id", personId)
      .in("status", ["active", "renewed"])
      .lte("start_date", endDate)
      .or(`end_date.is.null,end_date.gte.${startDate}`)
      .limit(1);

    if (error) throw error;
    return (data?.length ?? 0) > 0;
  } catch (error) {
    handleDatabaseError(error, "check contract coverage");
  }
}

export async function getPeopleWithContractCoverage(
  startDate: string,
  endDate: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("person_id")
      .in("status", ["active", "renewed"])
      .lte("start_date", endDate)
      .or(`end_date.is.null,end_date.gte.${startDate}`);

    if (error) throw error;
    return [...new Set((data ?? []).map((c) => c.person_id as string))];
  } catch (error) {
    handleDatabaseError(error, "get people with contract coverage");
  }
}
