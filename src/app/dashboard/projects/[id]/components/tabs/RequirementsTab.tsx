import React from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/date";
import type { Tables } from "@/types/supabase";

interface RequirementsTabProps {
  groupedRequirements: (Tables<"project_requirements_detailed"> & { children?: Tables<"project_requirements_detailed">[] })[];
  loading: boolean;
  onCreateRequirement: () => void;
  onEditRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onDeleteRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
}

export function RequirementsTab({
  groupedRequirements,
  loading,
  onCreateRequirement,
  onEditRequirement,
  onDeleteRequirement,
}: RequirementsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Resource Requirements</CardTitle>
            <CardDescription>
              Define the people and roles needed for this project
            </CardDescription>
          </div>
          <Button onClick={onCreateRequirement}>
            <Plus className="mr-2 h-4 w-4" />
            Add Requirement
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
                <TableHead>Role Type</TableHead>
                <TableHead>Required Count</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!groupedRequirements || groupedRequirements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No resource requirements defined. Add the first requirement to get started.
                  </TableCell>
                </TableRow>
              ) : (
                groupedRequirements.map((requirement) => (
                  <React.Fragment key={requirement.id}>
                    {/* Parent Requirement */}
                    <TableRow className="border-b">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{requirement.role_type_name}</span>
                          {requirement.auto_generated_type && (
                            <Badge 
                              variant={requirement.auto_generated_type === 'leave_coverage' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {requirement.auto_generated_type === 'leave_coverage' ? 'Leave Coverage' : 'Partial Gap'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {requirement.required_count} {requirement.required_count === 1 ? 'person' : 'people'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(requirement.start_date!)}</TableCell>
                      <TableCell>{formatDate(requirement.end_date!)}</TableCell>
                      <TableCell>
                        {!requirement.auto_generated_type && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditRequirement(requirement)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteRequirement(requirement)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {/* Child Requirements (Auto-Generated) */}
                    {requirement.children && requirement.children.map((child) => (
                      <TableRow key={child.id} className="bg-gray-50 border-l-4 border-l-blue-200">
                        <TableCell className="font-medium pl-8">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">↳</span>
                            <span>{child.role_type_name}</span>
                            <Badge 
                              variant={child.auto_generated_type === 'leave_coverage' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {child.auto_generated_type === 'leave_coverage' ? 'Leave Coverage' : 'Partial Gap'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {child.required_count} {child.required_count === 1 ? 'person' : 'people'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(child.start_date!)}</TableCell>
                        <TableCell className="text-sm">{formatDate(child.end_date!)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">Auto-generated</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}