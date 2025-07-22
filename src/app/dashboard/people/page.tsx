"use client";

import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePeople } from "@/lib/hooks/use-people";
import { useResourceAnalytics } from "@/lib/hooks/use-resource-analytics";
import { TimePeriodSelector } from "@/components/ui/time-period-selector";
import { useTimePeriod } from "@/lib/providers/time-period-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonForm } from "./components/person-form";
import type { Tables } from "@/types/supabase";

type UtilizationFilter = "all" | "under-utilized" | "utilized" | "over-utilized";

export default function PeoplePage() {
  const { people, loading, create, update, remove } = usePeople();
  const { peopleUtilization, loading: analyticsLoading } = useResourceAnalytics();
  const { range } = useTimePeriod();
  const [searchTerm, setSearchTerm] = useState("");
  const [utilizationFilter, setUtilizationFilter] = useState<UtilizationFilter>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Tables<"people_with_roles"> | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Tables<"people_with_roles"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getPersonUtilization = (personId: string) => {
    const utilization = peopleUtilization.find(u => u.person_id === personId);
    return utilization ? utilization.utilization_percentage : 0;
  };

  const getUtilizationStatus = (utilization: number): UtilizationFilter => {
    if (utilization > 100) return "over-utilized";
    if (utilization >= 50) return "utilized";
    return "under-utilized";
  };

  const filteredAndSortedPeople = people
    .filter(person => {
      // Text search filter
      const matchesSearch = person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.role_type_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Utilization filter
      if (utilizationFilter === "all") return true;
      
      const utilization = getPersonUtilization(person.id!);
      const status = getUtilizationStatus(utilization);
      return status === utilizationFilter;
    })
    .sort((a, b) => {
      // Sort by utilization percentage
      const aUtil = getPersonUtilization(a.id!);
      const bUtil = getPersonUtilization(b.id!);
      
      switch (utilizationFilter) {
        case "over-utilized":
          return bUtil - aUtil; // Highest first
        case "under-utilized":
          return aUtil - bUtil; // Lowest first
        case "utilized":
          return Math.abs(bUtil - 75) - Math.abs(aUtil - 75); // Closest to 75% first
        default:
          return bUtil - aUtil; // Highest first by default
      }
    });

  const getUtilizationBadge = (utilization: number) => {
    if (utilization > 100) {
      return <Badge variant="destructive">{utilization}%</Badge>;
    } else if (utilization >= 80) {
      return <Badge variant="default">{utilization}%</Badge>;
    } else if (utilization >= 50) {
      return <Badge variant="secondary">{utilization}%</Badge>;
    } else {
      return <Badge variant="outline">{utilization}%</Badge>;
    }
  };

  const handleCreate = async (data: { name: string; role_type_id: string }) => {
    try {
      await create(data);
      setShowCreateDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdate = async (data: { name: string; role_type_id: string }) => {
    if (!editingPerson?.id) return;
    try {
      await update(editingPerson.id, data);
      setEditingPerson(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDelete = async () => {
    if (!deletingPerson?.id) return;
    try {
      setIsDeleting(true);
      await remove(deletingPerson.id);
      setDeletingPerson(null);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground">
            Manage people in your organization
          </p>
        </div>
        <div className="flex items-center gap-4">
          <TimePeriodSelector compact />
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Person
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
          <CardDescription>
            View and manage all people - utilization based on {range.description.toLowerCase()}
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={utilizationFilter} onValueChange={(value: UtilizationFilter) => setUtilizationFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                <SelectItem value="under-utilized">Under-utilized (&lt;50%)</SelectItem>
                <SelectItem value="utilized">Utilized (50-100%)</SelectItem>
                <SelectItem value="over-utilized">Over-utilized (&gt;100%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role Type</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedPeople.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm || utilizationFilter !== "all" 
                        ? "No people found matching your filters." 
                        : "No people found. Add your first person to get started."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                      filteredAndSortedPeople.map((person) => {
                        const utilization = getPersonUtilization(person.id!);
                        return (
                          <TableRow key={person.id}>
                            <TableCell className="font-medium">
                              <button
                                onClick={() => window.location.href = `/dashboard/people/${person.id}`}
                                className="text-left hover:underline"
                              >
                                {person.name}
                              </button>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{person.role_type_name}</Badge>
                            </TableCell>
                            <TableCell>
                              {analyticsLoading ? (
                                <Skeleton className="h-5 w-12" />
                              ) : (
                                getUtilizationBadge(utilization)
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingPerson(person)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingPerson(person)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Person</DialogTitle>
            <DialogDescription>
              Add a new person to your organization
            </DialogDescription>
          </DialogHeader>
          <PersonForm onSubmit={handleCreate} onCancel={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPerson} onOpenChange={() => setEditingPerson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
            <DialogDescription>
              Update the person's details
            </DialogDescription>
          </DialogHeader>
          {editingPerson && (
            <PersonForm
              initialData={{
                name: editingPerson.name || "",
                role_type_id: editingPerson.role_type_id || "",
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditingPerson(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPerson} onOpenChange={() => setDeletingPerson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Person</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPerson?.name}"? This action cannot be undone.
              {deletingPerson && (
                <div className="mt-2 text-sm text-muted-foreground">
                  This will only work if this person has no active project allocations.
                </div>
              )}
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
