"use client";

import { useState } from "react";
import { Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContracts } from "@/lib/hooks/use-contracts";
import { ContractForm } from "./components/contract-form";
import { formatDate } from "@/lib/utils/date";
import type { ContractWithPerson, Contract } from "@/lib/supabase";
import type { ContractFormData } from "@/lib/utils/validation";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  contractor: "Contractor",
  fixed_term: "Fixed Term",
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  renewed: "Renewed",
  cancelled: "Cancelled",
};

function ContractTypeBadge({ type }: { type: string }) {
  const variants: Record<string, string> = {
    permanent: "bg-blue-100 text-blue-800",
    contractor: "bg-purple-100 text-purple-800",
    fixed_term: "bg-orange-100 text-orange-800",
  };
  return (
    <Badge variant="outline" className={variants[type] ?? ""}>
      {CONTRACT_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

function ContractStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    expired: "bg-red-100 text-red-800",
    renewed: "bg-teal-100 text-teal-800",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <Badge variant="outline" className={variants[status] ?? ""}>
      {CONTRACT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function isExpiringSoon(contract: Contract): boolean {
  if (!contract.end_date || contract.status !== "active") return false;
  const daysUntilExpiry = Math.ceil(
    (new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
}

function ContractsTable({
  contracts,
  loading,
  searchTerm,
  onEdit,
  onDelete,
}: {
  contracts: ContractWithPerson[];
  loading: boolean;
  searchTerm: string;
  onEdit: (c: Contract) => void;
  onDelete: (c: Contract) => void;
}) {
  const filtered = contracts.filter((c) =>
    c.people?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-4 w-[160px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[110px]" />
            <Skeleton className="h-4 w-[110px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Person</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No contracts found matching your search." : "No contracts found."}
            </TableCell>
          </TableRow>
        ) : (
          filtered.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {contract.people?.display_name}
                  {isExpiringSoon(contract) && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <ContractTypeBadge type={contract.contract_type} />
              </TableCell>
              <TableCell>
                <ContractStatusBadge status={contract.status} />
              </TableCell>
              <TableCell>{formatDate(contract.start_date)}</TableCell>
              <TableCell>
                {contract.end_date ? formatDate(contract.end_date) : (
                  <span className="text-muted-foreground text-sm">Ongoing</span>
                )}
              </TableCell>
              <TableCell>
                {contract.length_months ? (
                  `${contract.length_months}mo`
                ) : contract.end_date ? (
                  `${Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))}mo`
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(contract)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(contract)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default function ContractsPage() {
  const { contracts, loading, create, update, remove } = useContracts();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deletingContract, setDeletingContract] = useState<Contract & { people?: { display_name: string } } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const allContracts = contracts as ContractWithPerson[];
  const activeContracts = allContracts.filter((c) => c.status === "active");
  const expiringSoon = allContracts.filter(isExpiringSoon);

  const handleCreate = async (data: ContractFormData) => {
    await create({
      person_id: data.person_id,
      contract_type: data.contract_type,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date || null,
      length_months: data.length_months ?? null,
      notes: data.notes || null,
    });
    setShowCreateDialog(false);
  };

  const handleUpdate = async (data: ContractFormData) => {
    if (!editingContract) return;
    await update(editingContract.id, {
      contract_type: data.contract_type,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date || null,
      length_months: data.length_months ?? null,
      notes: data.notes || null,
    });
    setEditingContract(null);
  };

  const handleDelete = async () => {
    if (!deletingContract) return;
    try {
      setIsDeleting(true);
      await remove(deletingContract.id);
      setDeletingContract(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground">Manage employment contracts and contractor agreements</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contract
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">{allContracts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <Badge variant="secondary" className="ml-2">{activeContracts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Soon
            {expiringSoon.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
                {expiringSoon.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {(["all", "active", "expiring"] as const).map((tab) => {
          const tabContracts =
            tab === "all" ? allContracts :
            tab === "active" ? activeContracts :
            expiringSoon;

          return (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {tab === "all" ? "All Contracts" : tab === "active" ? "Active Contracts" : "Expiring Within 30 Days"}
                  </CardTitle>
                  <CardDescription>
                    {tab === "expiring"
                      ? "Contracts ending within the next 30 days that need attention"
                      : "View and manage contracts across the organisation"}
                  </CardDescription>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by person..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ContractsTable
                    contracts={tabContracts}
                    loading={loading}
                    searchTerm={searchTerm}
                    onEdit={setEditingContract}
                    onDelete={setDeletingContract}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contract</DialogTitle>
            <DialogDescription>Create a new employment contract or contractor agreement</DialogDescription>
          </DialogHeader>
          <ContractForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingContract} onOpenChange={() => setEditingContract(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contract</DialogTitle>
            <DialogDescription>Update the contract details</DialogDescription>
          </DialogHeader>
          {editingContract && (
            <ContractForm
              initialData={editingContract}
              onSubmit={handleUpdate}
              onCancel={() => setEditingContract(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingContract} onOpenChange={() => setDeletingContract(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the contract for{" "}
              <strong>{(deletingContract as ContractWithPerson)?.people?.display_name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
