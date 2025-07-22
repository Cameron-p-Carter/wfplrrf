import React, { useState } from "react";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/date";
import type { Tables } from "@/types/supabase";

interface Gap {
  role_type_name: string;
  required_count: number;
  allocated_count: number;
  gap_count: number;
  start_date: string;
  end_date: string;
}

interface ResourcesTabProps {
  groupedRequirements: (Tables<"project_requirements_detailed"> & { children?: Tables<"project_requirements_detailed">[] })[];
  allocations: Tables<"project_allocations_detailed">[];
  gaps: Gap[];
  requirementsLoading: boolean;
  allocationsLoading: boolean;
  onCreateRequirement: () => void;
  onEditRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onDeleteRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
  onIgnoreRequirement?: (requirement: Tables<"project_requirements_detailed">) => void;
  onUnIgnoreRequirement?: (requirement: Tables<"project_requirements_detailed">) => void;
  onCreateAllocation: () => void;
  onEditAllocation: (allocation: Tables<"project_allocations_detailed">) => void;
  onDeleteAllocation: (allocation: Tables<"project_allocations_detailed">) => void;
  onAllocateToRequirement: (requirement: Tables<"project_requirements_detailed">) => void;
}

type FilterType = "all" | "allocated" | "unallocated";

export function ResourcesTab({
  groupedRequirements,
  allocations,
  gaps,
  requirementsLoading,
  allocationsLoading,
  onCreateRequirement,
  onEditRequirement,
  onDeleteRequirement,
  onIgnoreRequirement,
  onUnIgnoreRequirement,
  onCreateAllocation,
  onEditAllocation,
  onDeleteAllocation,
  onAllocateToRequirement,
}: ResourcesTabProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const loading = requirementsLoading || allocationsLoading;

  // Get allocations for a specific requirement
  const getAllocationsForRequirement = (requirementId: string) => {
    return allocations.filter(allocation => allocation.requirement_id === requirementId);
  };

  // Filter requirements based on allocation status
  const getFilteredRequirements = () => {
    if (!groupedRequirements) return [];

    const filterRequirement = (requirement: Tables<"project_requirements_detailed"> & { children?: Tables<"project_requirements_detailed">[] }) => {
      const reqAllocations = getAllocationsForRequirement(requirement.id!);
      const hasAllocations = reqAllocations.length > 0;
      
      // Check children allocations too
      let childrenHaveAllocations = false;
      if (requirement.children) {
        childrenHaveAllocations = requirement.children.some(child => 
          getAllocationsForRequirement(child.id!).length > 0
        );
      }

      const isAllocated = hasAllocations || childrenHaveAllocations;

      switch (filter) {
        case "allocated":
          return isAllocated;
        case "unallocated":
          return !isAllocated;
        default:
          return true;
      }
    };

    return groupedRequirements.filter(filterRequirement);
  };

  // Sort requirements chronologically
  const sortedRequirements = getFilteredRequirements().sort((a, b) => {
    return new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime();
  });

  const handleAddAllocation = (requirement: Tables<"project_requirements_detailed">) => {
    onAllocateToRequirement(requirement);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Resources</CardTitle>
            <CardDescription>
              Project requirements and their allocations
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="unallocated">Unallocated</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onCreateRequirement}>
              <Plus className="mr-2 h-4 w-4" />
              Add Requirement
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-sm text-muted-foreground">
          <p>Greyed out requirements are ignored and don't count towards project gaps. Use the restore button (↻) to reactivate them.</p>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-[200px]" />
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
                <TableHead>Required</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!sortedRequirements || sortedRequirements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {filter === "unallocated" ? (
                      "No unallocated requirements found."
                    ) : filter === "allocated" ? (
                      "No allocated requirements found."
                    ) : (
                      "No requirements defined. Add the first requirement to get started."
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedRequirements.map((requirement) => {
                  const reqAllocations = getAllocationsForRequirement(requirement.id!);
                  const isIgnored = requirement.ignored === true;
                  const isAutoGenerated = requirement.auto_generated_type !== null;
                  
                  return (
                    <React.Fragment key={requirement.id}>
                      {/* Parent Requirement */}
                      <TableRow className={`border-b ${isIgnored ? "bg-gray-50/50 opacity-60" : ""}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span className={isIgnored ? "line-through text-gray-500" : ""}>{requirement.role_type_name}</span>
                            {requirement.auto_generated_type && !isIgnored && (
                              <Badge 
                                variant={requirement.auto_generated_type === 'leave_coverage' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {requirement.auto_generated_type === 'leave_coverage' ? 'Leave Coverage' : 'Partial Gap'}
                              </Badge>
                            )}
                            {isIgnored && (
                              <>
                                <Badge variant="secondary" className="text-xs opacity-60">Auto</Badge>
                                <Badge variant="outline" className="text-xs">Ignored</Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {requirement.required_count} {requirement.required_count === 1 ? 'person' : 'people'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {reqAllocations.length > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {reqAllocations.length} allocation{reqAllocations.length !== 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(requirement.start_date!)}</TableCell>
                        <TableCell>{formatDate(requirement.end_date!)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {!requirement.auto_generated_type && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditRequirement(requirement)}
                                  title="Edit requirement"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteRequirement(requirement)}
                                  title="Delete requirement"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isAutoGenerated && !isIgnored && onIgnoreRequirement && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onIgnoreRequirement(requirement)}
                                title="Ignore this auto-generated requirement"
                                className="text-yellow-600 hover:bg-yellow-50"
                              >
                                <span className="text-sm">×</span>
                              </Button>
                            )}
                            {isIgnored && onUnIgnoreRequirement && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onUnIgnoreRequirement(requirement)}
                                title="Restore this requirement"
                                className="text-green-600 hover:bg-green-50"
                              >
                                <span className="text-sm">↻</span>
                              </Button>
                            )}
                            {!isIgnored && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddAllocation(requirement)}
                                title="Add allocation"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Allocations for this requirement */}
                      {reqAllocations.map((allocation) => (
                        <TableRow key={`alloc-${allocation.id}`} className="bg-gray-50/50">
                          <TableCell className="pl-8">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{allocation.person_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{allocation.role_type_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              (allocation.allocation_percentage || 0) > 100 ? "destructive" :
                              (allocation.allocation_percentage || 0) >= 80 ? "default" : "secondary"
                            } className="text-xs">
                              {allocation.allocation_percentage}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(allocation.start_date!)}</TableCell>
                          <TableCell className="text-sm">{formatDate(allocation.end_date!)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditAllocation(allocation)}
                                title="Edit allocation"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteAllocation(allocation)}
                                title="Delete allocation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Child Requirements (Auto-Generated) */}
                      {requirement.children && requirement.children.map((child) => {
                        const childAllocations = getAllocationsForRequirement(child.id!);
                        const childIsIgnored = child.ignored === true;
                        const childIsAutoGenerated = child.auto_generated_type !== null;
                        
                        return (
                          <React.Fragment key={child.id}>
                            <TableRow className={`bg-blue-50/50 border-l-4 border-l-blue-200 ${childIsIgnored ? "bg-gray-50/50 opacity-60" : ""}`}>
                              <TableCell className="font-medium pl-8">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground">↳</span>
                                  <span className={childIsIgnored ? "line-through text-gray-500" : ""}>{child.role_type_name}</span>
                                  {child.auto_generated_type && !childIsIgnored && (
                                    <Badge 
                                      variant={child.auto_generated_type === 'leave_coverage' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {child.auto_generated_type === 'leave_coverage' ? 'Leave Coverage' : 'Partial Gap'}
                                    </Badge>
                                  )}
                                  {childIsIgnored && (
                                    <>
                                      <Badge variant="secondary" className="text-xs opacity-60">Auto</Badge>
                                      <Badge variant="outline" className="text-xs">Ignored</Badge>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {child.required_count} {child.required_count === 1 ? 'person' : 'people'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {childAllocations.length > 0 ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {childAllocations.length} allocation{childAllocations.length !== 1 ? 's' : ''}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">None</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(child.start_date!)}</TableCell>
                              <TableCell className="text-sm">{formatDate(child.end_date!)}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1">
                                  {childIsAutoGenerated && !childIsIgnored && onIgnoreRequirement && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onIgnoreRequirement(child)}
                                      title="Ignore this auto-generated requirement"
                                      className="text-yellow-600 hover:bg-yellow-50"
                                    >
                                      <span className="text-sm">×</span>
                                    </Button>
                                  )}
                                  {childIsIgnored && onUnIgnoreRequirement && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onUnIgnoreRequirement(child)}
                                      title="Restore this requirement"
                                      className="text-green-600 hover:bg-green-50"
                                    >
                                      <span className="text-sm">↻</span>
                                    </Button>
                                  )}
                                  {!childIsIgnored && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAddAllocation(child)}
                                      title="Add allocation"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <span className="text-xs text-muted-foreground ml-1">Auto-generated</span>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {/* Allocations for child requirement */}
                            {childAllocations.map((allocation) => (
                              <TableRow key={`child-alloc-${allocation.id}`} className="bg-blue-50/30">
                                <TableCell className="pl-12">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{allocation.person_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{allocation.role_type_name}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    (allocation.allocation_percentage || 0) > 100 ? "destructive" :
                                    (allocation.allocation_percentage || 0) >= 80 ? "default" : "secondary"
                                  } className="text-xs">
                                    {allocation.allocation_percentage}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{formatDate(allocation.start_date!)}</TableCell>
                                <TableCell className="text-sm">{formatDate(allocation.end_date!)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onEditAllocation(allocation)}
                                      title="Edit allocation"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onDeleteAllocation(allocation)}
                                      title="Delete allocation"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}