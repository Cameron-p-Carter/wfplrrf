import React from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/date";
import type { Tables } from "@/types/supabase";

interface AllocationsTabProps {
  allocations: Tables<"project_allocations_detailed">[];
  loading: boolean;
  onCreateAllocation: () => void;
  onEditAllocation: (allocation: Tables<"project_allocations_detailed">) => void;
  onDeleteAllocation: (allocation: Tables<"project_allocations_detailed">) => void;
}

export function AllocationsTab({
  allocations,
  loading,
  onCreateAllocation,
  onEditAllocation,
  onDeleteAllocation,
}: AllocationsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Resource Allocations</CardTitle>
            <CardDescription>
              People assigned to this project
            </CardDescription>
          </div>
          <Button onClick={onCreateAllocation}>
            <Plus className="mr-2 h-4 w-4" />
            Add Allocation
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!allocations || allocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No allocations yet. Add the first allocation to get started.
                  </TableCell>
                </TableRow>
              ) : (
                allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell className="font-medium">
                      {allocation.person_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{allocation.role_type_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        (allocation.allocation_percentage || 0) > 100 ? "destructive" :
                        (allocation.allocation_percentage || 0) >= 80 ? "default" : "secondary"
                      }>
                        {allocation.allocation_percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(allocation.start_date!)}</TableCell>
                    <TableCell>{formatDate(allocation.end_date!)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditAllocation(allocation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteAllocation(allocation)}
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
  );
}