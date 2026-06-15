"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjects } from "@/lib/hooks/use-projects";
import { useCurrentPeriodGaps } from "@/lib/hooks/use-current-period-gaps";
import { ProjectForm } from "./components/project-form";
import { formatDate } from "@/lib/utils/date";
import type { Tables } from "@/types/supabase";

type StatusFilter = "all" | "active" | "upcoming" | "completed";

function getProjectStatus(project: Tables<"projects">) {
  const now = new Date();
  const start = new Date(project.start_date);
  const end = new Date(project.end_date);
  if (now < start) return "upcoming" as const;
  if (now > end) return "completed" as const;
  return "active" as const;
}

const STATUS_CONFIG = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  upcoming: { label: "Upcoming", className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Completed", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const STATUS_BORDER = {
  active: "border-l-emerald-500",
  upcoming: "border-l-blue-500",
  completed: "border-l-slate-300",
};

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, create, update, remove } = useProjects();
  const { projectsWithGaps, loading: gapsLoading } = useCurrentPeriodGaps();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Tables<"projects"> | null>(null);
  const [deletingProject, setDeletingProject] = useState<Tables<"projects"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const gapMap = useMemo(
    () => new Map(projectsWithGaps.map((p) => [p.id, p.gap_count])),
    [projectsWithGaps]
  );

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((p) => getProjectStatus(p) === "active").length,
      upcoming: projects.filter((p) => getProjectStatus(p) === "upcoming").length,
      completed: projects.filter((p) => getProjectStatus(p) === "completed").length,
    }),
    [projects]
  );

  const filteredProjects = useMemo(
    () =>
      projects
        .filter((p) => {
          const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchStatus = statusFilter === "all" || getProjectStatus(p) === statusFilter;
          return matchSearch && matchStatus;
        })
        .sort((a, b) => {
          // Active first, then upcoming (soonest first), then completed (most recent first)
          const statusOrder = { active: 0, upcoming: 1, completed: 2 };
          const aStatus = getProjectStatus(a);
          const bStatus = getProjectStatus(b);
          if (aStatus !== bStatus) return statusOrder[aStatus] - statusOrder[bStatus];
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        }),
    [projects, searchTerm, statusFilter]
  );

  const handleCreate = async (data: { name: string; start_date: string; end_date: string }) => {
    try {
      await create(data);
      setShowCreateDialog(false);
    } catch {}
  };

  const handleUpdate = async (data: { name: string; start_date: string; end_date: string }) => {
    if (!editingProject) return;
    try {
      await update(editingProject.id, data);
      setEditingProject(null);
    } catch {}
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    try {
      setIsDeleting(true);
      await remove(deletingProject.id);
      setDeletingProject(null);
    } catch {} finally { setIsDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            {loading ? "Loading…" : `${counts.active} active · ${counts.upcoming} upcoming · ${counts.completed} completed`}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{counts.all}</span>
                </TabsTrigger>
                <TabsTrigger value="active">
                  Active
                  {counts.active > 0 && (
                    <span className="ml-1.5 text-xs text-emerald-600 tabular-nums">{counts.active}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "No projects match your filters."
                  : "No projects yet. Create your first project to get started."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Project
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Project</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-52">Dates</TableHead>
                  <TableHead className="w-32">Resource gaps</TableHead>
                  <TableHead className="w-24 pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => {
                  const status = getProjectStatus(project);
                  const config = STATUS_CONFIG[status];
                  const gapCount = gapMap.get(project.id) ?? 0;

                  return (
                    <TableRow
                      key={project.id}
                      className={`cursor-pointer group border-l-2 ${STATUS_BORDER[status]}`}
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    >
                      <TableCell className="pl-6">
                        <div className="font-medium group-hover:underline">{project.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${config.className} font-normal`}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(project.start_date)} – {formatDate(project.end_date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {gapsLoading ? (
                          <Skeleton className="h-4 w-12" />
                        ) : gapCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="text-sm font-medium">{gapCount} gap{gapCount !== 1 ? "s" : ""}</span>
                          </div>
                        ) : status !== "completed" ? (
                          <span className="text-xs text-emerald-600 font-medium">Fully staffed</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditingProject(project)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingProject(project)}
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
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Add a new project to your organisation</DialogDescription>
          </DialogHeader>
          <ProjectForm onSubmit={handleCreate} onCancel={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the project details</DialogDescription>
          </DialogHeader>
          {editingProject && (
            <ProjectForm
              initialData={editingProject}
              onSubmit={handleUpdate}
              onCancel={() => setEditingProject(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>"{deletingProject?.name}"</strong>? This cannot be undone and will fail if the
              project has existing allocations or requirements.
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
    </div>
  );
}
