"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePeople } from "@/lib/hooks/use-people";
import { useResourceAnalytics } from "@/lib/hooks/use-resource-analytics";
import { TimePeriodSelector } from "@/components/ui/time-period-selector";
import { useTimePeriod } from "@/lib/providers/time-period-provider";
import { PersonForm } from "./components/person-form";
import { ProjectSuggestionsDialog } from "@/components/ui/project-suggestions-dialog";
import { useProjectSuggestions } from "@/lib/hooks/use-project-suggestions";
import type { Tables } from "@/types/supabase";

type UtilizationFilter = "all" | "under-utilized" | "utilized" | "over-utilized";

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
];

function getAvatarColor(name: string): string {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function PersonAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className={`${getAvatarColor(name)} h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 select-none`}
    >
      {initials}
    </div>
  );
}

function UtilizationBar({ value, loading }: { value: number; loading: boolean }) {
  if (loading) return <Skeleton className="h-2 w-28" />;
  const clamped = Math.min(value, 100);
  const barColor =
    value > 100 ? "bg-red-500" :
    value >= 80 ? "bg-emerald-500" :
    value >= 50 ? "bg-yellow-400" :
    "bg-slate-300";
  const textColor =
    value > 100 ? "text-red-600" :
    value >= 80 ? "text-emerald-600" :
    value >= 50 ? "text-yellow-600" :
    "text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums w-8 text-right ${textColor}`}>
        {value}%
      </span>
    </div>
  );
}

export default function PeoplePage() {
  const router = useRouter();
  const { people, loading, create, update, remove } = usePeople();
  const { peopleUtilization, loading: analyticsLoading } = useResourceAnalytics();
  const { range } = useTimePeriod();
  const { suggestions, loading: suggestionsLoading, fetchSuggestions } = useProjectSuggestions();

  const [searchTerm, setSearchTerm] = useState("");
  const [utilizationFilter, setUtilizationFilter] = useState<UtilizationFilter>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Tables<"people_with_roles"> | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Tables<"people_with_roles"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Tables<"people_with_roles"> | null>(null);

  const getPersonUtilization = (personId: string) =>
    peopleUtilization.find((u) => u.person_id === personId)?.utilization_percentage ?? 0;

  const getUtilizationStatus = (u: number): UtilizationFilter =>
    u > 100 ? "over-utilized" : u >= 50 ? "utilized" : "under-utilized";

  const filteredPeople = people
    .filter((person) => {
      const matchesSearch =
        person.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.role_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (utilizationFilter === "all") return true;
      return getUtilizationStatus(getPersonUtilization(person.id!)) === utilizationFilter;
    })
    .sort((a, b) => {
      const aU = getPersonUtilization(a.id!);
      const bU = getPersonUtilization(b.id!);
      if (utilizationFilter === "over-utilized") return bU - aU;
      if (utilizationFilter === "under-utilized") return aU - bU;
      return bU - aU;
    });

  const counts = analyticsLoading
    ? { all: people.length, "under-utilized": 0, utilized: 0, "over-utilized": 0 }
    : {
        all: people.length,
        "under-utilized": people.filter((p) => getUtilizationStatus(getPersonUtilization(p.id!)) === "under-utilized").length,
        utilized: people.filter((p) => getUtilizationStatus(getPersonUtilization(p.id!)) === "utilized").length,
        "over-utilized": people.filter((p) => getUtilizationStatus(getPersonUtilization(p.id!)) === "over-utilized").length,
      };

  const handleCreate = async (data: { first_name: string; last_name: string; role_type_id: string }) => {
    try {
      await create({ ...data, display_name: `${data.first_name} ${data.last_name}` });
      setShowCreateDialog(false);
    } catch {}
  };

  const handleUpdate = async (data: { first_name: string; last_name: string; role_type_id: string }) => {
    if (!editingPerson?.id) return;
    try {
      await update(editingPerson.id, { ...data, display_name: `${data.first_name} ${data.last_name}` });
      setEditingPerson(null);
    } catch {}
  };

  const handleDelete = async () => {
    if (!deletingPerson?.id) return;
    try {
      setIsDeleting(true);
      await remove(deletingPerson.id);
      setDeletingPerson(null);
    } catch {} finally { setIsDeleting(false); }
  };

  const handleSuggestions = async (e: React.MouseEvent, person: Tables<"people_with_roles">) => {
    e.stopPropagation();
    setSelectedPerson(person);
    setShowSuggestions(true);
    if (person.role_type_name) await fetchSuggestions(person.role_type_name);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground">
            {loading ? "Loading…" : `${people.length} team members · utilisation for ${range.description.toLowerCase()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimePeriodSelector compact />
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Person
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, role, email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Tabs value={utilizationFilter} onValueChange={(v) => setUtilizationFilter(v as UtilizationFilter)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{counts.all}</span>
                </TabsTrigger>
                <TabsTrigger value="under-utilized">
                  Low
                  {counts["under-utilized"] > 0 && (
                    <span className="ml-1.5 text-xs text-yellow-600 tabular-nums">{counts["under-utilized"]}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="utilized">Healthy</TabsTrigger>
                <TabsTrigger value="over-utilized">
                  Over
                  {counts["over-utilized"] > 0 && (
                    <span className="ml-1.5 text-xs text-red-600 tabular-nums">{counts["over-utilized"]}</span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-2 w-28" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || utilizationFilter !== "all"
                  ? "No people match your filters."
                  : "No people yet. Add your first team member to get started."}
              </p>
              {!searchTerm && utilizationFilter === "all" && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Person
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-52">Utilisation</TableHead>
                  <TableHead className="w-32 pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeople.map((person) => {
                  const utilization = getPersonUtilization(person.id!);
                  const isUnder = getUtilizationStatus(utilization) === "under-utilized";

                  return (
                    <TableRow
                      key={person.id}
                      className="cursor-pointer group"
                      onClick={() => router.push(`/dashboard/people/${person.id}`)}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={person.display_name || "?"} />
                          <div className="min-w-0">
                            <div className="font-medium leading-snug group-hover:underline truncate">
                              {person.display_name}
                            </div>
                            {person.email && (
                              <div className="text-xs text-muted-foreground truncate">{person.email}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal whitespace-nowrap">
                          {person.role_type_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <UtilizationBar value={utilization} loading={analyticsLoading} />
                      </TableCell>
                      <TableCell className="pr-6">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isUnder && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                              title="View project suggestions"
                              onClick={(e) => handleSuggestions(e, person)}
                            >
                              <Lightbulb className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditingPerson(person)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingPerson(person)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Person</DialogTitle>
            <DialogDescription>Add a new person to your organisation</DialogDescription>
          </DialogHeader>
          <PersonForm onSubmit={handleCreate} onCancel={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editingPerson} onOpenChange={() => setEditingPerson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
            <DialogDescription>Update this person's details</DialogDescription>
          </DialogHeader>
          {editingPerson && (
            <PersonForm
              initialData={{
                first_name: editingPerson.first_name || "",
                last_name: editingPerson.last_name || "",
                role_type_id: editingPerson.role_type_id || "",
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditingPerson(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deletingPerson} onOpenChange={() => setDeletingPerson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Person</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingPerson?.display_name}</strong>? This cannot be undone and will fail if
              the person has active project allocations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suggestions */}
      <ProjectSuggestionsDialog
        open={showSuggestions}
        onOpenChange={setShowSuggestions}
        personName={selectedPerson?.display_name || ""}
        personRoleType={selectedPerson?.role_type_name || ""}
        suggestions={suggestions}
        loading={suggestionsLoading}
      />
    </div>
  );
}
