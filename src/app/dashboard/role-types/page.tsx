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
import { useRoleTypes } from "@/lib/hooks/use-role-types";
import { RoleTypeForm } from "./components/role-type-form";
import type { Tables } from "@/types/supabase";

export default function RoleTypesPage() {
  const { roleTypes, loading, create, update, remove } = useRoleTypes();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRoleType, setEditingRoleType] = useState<Tables<"role_types"> | null>(null);
  const [deletingRoleType, setDeletingRoleType] = useState<Tables<"role_types"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredRoleTypes = roleTypes.filter(roleType =>
    roleType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (roleType.description && roleType.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreate = async (data: { name: string; description?: string }) => {
    try {
      await create(data);
      setShowCreateDialog(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdate = async (data: { name: string; description?: string }) => {
    if (!editingRoleType) return;
    try {
      await update(editingRoleType.id, data);
      setEditingRoleType(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDelete = async () => {
    if (!deletingRoleType) return;
    try {
      setIsDeleting(true);
      await remove(deletingRoleType.id);
      setDeletingRoleType(null);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Types</h1>
          <p className="text-muted-foreground">
            Manage role types for your organization
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Types</CardTitle>
          <CardDescription>
            Define the different roles available in your organization
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search role types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[300px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>People Count</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoleTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No role types found matching your search." : "No role types found. Create your first role type to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoleTypes.map((roleType) => (
                    <TableRow key={roleType.id}>
                      <TableCell className="font-medium">{roleType.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {roleType.description || "No description"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">0</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRoleType(roleType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingRoleType(roleType)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
            <DialogTitle>Create Role Type</DialogTitle>
            <DialogDescription>
              Add a new role type to your organization
            </DialogDescription>
          </DialogHeader>
          <RoleTypeForm onSubmit={handleCreate} onCancel={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRoleType} onOpenChange={() => setEditingRoleType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role Type</DialogTitle>
            <DialogDescription>
              Update the role type details
            </DialogDescription>
          </DialogHeader>
          {editingRoleType && (
            <RoleTypeForm
              initialData={editingRoleType}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRoleType(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRoleType} onOpenChange={() => setDeletingRoleType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRoleType?.name}"? This action cannot be undone.
              {deletingRoleType && (
                <div className="mt-2 text-sm text-muted-foreground">
                  This will only work if no people or projects are currently using this role type.
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
