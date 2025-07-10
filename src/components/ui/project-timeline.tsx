"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { 
  TimelineConfig, 
  generateTimelineColumns, 
  calculateItemPosition 
} from "@/lib/utils/timeline";
import type { Tables } from "@/types/supabase";

interface RequirementWithAllocations {
  id: string;
  requirement: Tables<"project_requirements_detailed">;
  allocations: Tables<"project_allocations_detailed">[];
  positions: RequirementPosition[];
}

interface RequirementPosition {
  id: string;
  requirementId: string;
  positionIndex: number;
  roleTypeName: string;
  startDate: Date;
  endDate: Date;
  allocatedPerson?: {
    id: string;
    name: string;
    allocationPercentage: number;
    allocationId: string;
    allocationStartDate: Date;
    allocationEndDate: Date;
  };
  requirement: Tables<"project_requirements_detailed">;
}

interface ProjectTimelineProps {
  title: string;
  requirements: Tables<"project_requirements_detailed">[];
  allocations: Tables<"project_allocations_detailed">[];
  config: TimelineConfig;
  onConfigChange?: (config: TimelineConfig) => void;
  onAllocatePosition?: (position: RequirementPosition) => void;
  onEditPosition?: (position: RequirementPosition) => void;
  onDeleteOrphanedAllocation?: (allocationId: string) => void;
  onEditAllocation?: (allocation: Tables<"project_allocations_detailed">) => void;
  onDeleteAllocation?: (allocationId: string) => void;
  onEditRequirement?: (requirement: Tables<"project_requirements_detailed">) => void;
  onDeleteRequirement?: (requirement: Tables<"project_requirements_detailed">) => void;
  className?: string;
  projectStartDate?: Date;
  projectEndDate?: Date;
}

export function ProjectTimeline({ 
  title, 
  requirements,
  allocations,
  config, 
  onConfigChange, 
  onAllocatePosition,
  onEditPosition,
  onDeleteOrphanedAllocation,
  onEditAllocation,
  onDeleteAllocation,
  onEditRequirement,
  onDeleteRequirement,
  className,
  projectStartDate,
  projectEndDate
}: ProjectTimelineProps) {
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [hoveredRequirement, setHoveredRequirement] = useState<string | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const columns = generateTimelineColumns(config);
  const timelineWidth = columns.length * 133; // Each column is approximately 133px wide

  const handleGranularityChange = (granularity: 'week' | 'month') => {
    if (onConfigChange) {
      onConfigChange({ ...config, granularity });
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!onConfigChange) return;
    
    const { startDate, endDate } = config;
    const diffMs = endDate.getTime() - startDate.getTime();
    
    let newStartDate: Date;
    let newEndDate: Date;
    
    if (direction === 'prev') {
      newStartDate = new Date(startDate.getTime() - diffMs);
      newEndDate = new Date(endDate.getTime() - diffMs);
    } else {
      newStartDate = new Date(startDate.getTime() + diffMs);
      newEndDate = new Date(endDate.getTime() + diffMs);
    }
    
    onConfigChange({
      ...config,
      startDate: newStartDate,
      endDate: newEndDate,
    });
  };

  // Group allocations by requirement and create nested structure
  const generateRequirementsWithAllocations = (): RequirementWithAllocations[] => {
    const requirementsWithAllocations: RequirementWithAllocations[] = [];
    
    requirements.forEach(req => {
      if (!req.start_date || !req.end_date || !req.role_type_name) return;
      
      // Find allocations that are directly linked to this requirement
      const relatedAllocations = allocations.filter(alloc => 
        alloc.requirement_id === req.id
      );

      const requiredCount = req.required_count || 1;
      const positions: RequirementPosition[] = [];
      
      // Create individual positions for each required count
      for (let i = 0; i < requiredCount; i++) {
        const positionId = `req-${req.id}-${i}`;
        
        // Try to assign an allocation to this position
        const allocation = relatedAllocations[i]; // Simple assignment for now
        
        positions.push({
          id: positionId,
          requirementId: req.id!,
          positionIndex: i,
          roleTypeName: req.role_type_name,
          startDate: new Date(req.start_date),
          endDate: new Date(req.end_date),
          allocatedPerson: allocation ? {
            id: allocation.person_id!,
            name: allocation.person_name!,
            allocationPercentage: allocation.allocation_percentage || 0,
            allocationId: allocation.id!,
            allocationStartDate: new Date(allocation.start_date!),
            allocationEndDate: new Date(allocation.end_date!)
          } : undefined,
          requirement: req
        });
      }

      requirementsWithAllocations.push({
        id: req.id!,
        requirement: req,
        allocations: relatedAllocations,
        positions
      });
    });
    
    // Add orphaned allocations (allocations with no requirement)
    const orphanedAllocations = allocations.filter(alloc => !alloc.requirement_id);
    
    if (orphanedAllocations.length > 0) {
      // Create a special "Orphaned Allocations" section
      const orphanedPositions: RequirementPosition[] = orphanedAllocations.map((allocation, index) => ({
        id: `orphan-${allocation.id}`,
        requirementId: 'orphaned',
        positionIndex: index,
        roleTypeName: allocation.role_type_name || 'Unknown Role',
        startDate: new Date(allocation.start_date!),
        endDate: new Date(allocation.end_date!),
        allocatedPerson: {
          id: allocation.person_id!,
          name: allocation.person_name!,
          allocationPercentage: allocation.allocation_percentage || 0,
          allocationId: allocation.id!,
          allocationStartDate: new Date(allocation.start_date!),
          allocationEndDate: new Date(allocation.end_date!)
        },
        requirement: {
          id: 'orphaned',
          role_type_name: allocation.role_type_name,
          start_date: allocation.start_date,
          end_date: allocation.end_date,
          required_count: 1,
          project_id: allocation.project_id,
          role_type_id: allocation.role_type_id,
          auto_generated_type: null,
          parent_requirement_id: null,
          source_allocation_id: null,
          created_at: null,
          updated_at: null,
          project_name: null
        }
      }));

      requirementsWithAllocations.push({
        id: 'orphaned',
        requirement: {
          id: 'orphaned',
          role_type_name: 'Orphaned Allocations',
          start_date: orphanedAllocations[0]?.start_date || '',
          end_date: orphanedAllocations[0]?.end_date || '',
          required_count: orphanedAllocations.length,
          project_id: orphanedAllocations[0]?.project_id || '',
          role_type_id: orphanedAllocations[0]?.role_type_id || '',
          auto_generated_type: null,
          parent_requirement_id: null,
          source_allocation_id: null,
          created_at: null,
          updated_at: null,
          project_name: null
        },
        allocations: orphanedAllocations,
        positions: orphanedPositions
      });
    }
    
    return requirementsWithAllocations;
  };

  const requirementsWithAllocations = generateRequirementsWithAllocations();

  const renderRequirementBlock = (reqWithAllocs: RequirementWithAllocations, blockIndex: number) => {
    const req = reqWithAllocs.requirement;
    const positions = reqWithAllocs.positions;
    const isOrphaned = req.id === 'orphaned';
    
    const requirementPosition = calculateItemPosition(
      { 
        id: req.id!, 
        title: req.role_type_name!, 
        startDate: new Date(req.start_date!), 
        endDate: new Date(req.end_date!), 
        type: 'requirement' 
      },
      config.startDate,
      config.endDate,
      timelineWidth
    );

    const blockHeight = Math.max(80, positions.length * 40 + 30); // Increased height for better spacing
    const topMargin = blockIndex === 0 ? 20 : 0; // Extra top margin for first block
    
    return (
      <div
        key={req.id}
        className="relative mb-8"
        style={{ 
          height: `${blockHeight}px`,
          marginTop: `${topMargin}px`,
        }}
      >
        {/* Requirement Background */}
        <div
          className={`absolute border-2 rounded-lg ${
            isOrphaned 
              ? 'bg-red-50 border-red-300' 
              : 'bg-gray-100 border-gray-300'
          }`}
          style={{
            left: `${requirementPosition.left}px`,
            width: `${Math.max(requirementPosition.width, 150)}px`,
            height: `${blockHeight}px`,
          }}
        >
          {/* Requirement Header */}
          <div 
            className={`p-2 border-b rounded-t-lg cursor-pointer transition-colors duration-200 ${
              isOrphaned 
                ? 'border-red-300 bg-red-100' 
                : 'border-gray-300 bg-gray-200 hover:bg-gray-300'
            }`}
            onMouseEnter={() => setHoveredRequirement(req.id!)}
            onMouseLeave={() => setHoveredRequirement(null)}
          >
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${
                  isOrphaned ? 'text-red-700' : 'text-gray-700'
                }`}>
                  {req.role_type_name} {isOrphaned ? '(No Requirement)' : `(${req.required_count} needed)`}
                </span>
                <div className="flex items-center space-x-1">
                  {isOrphaned && (
                    <Badge variant="destructive" className="text-xs">
                      Orphaned
                    </Badge>
                  )}
                  {/* Show edit/delete buttons for non-orphaned requirements when hovered */}
                  {!isOrphaned && hoveredRequirement === req.id && !req.auto_generated_type && (
                    <>
                      {onEditRequirement && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-blue-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRequirement(req);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {onDeleteRequirement && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-red-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRequirement(req);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <span className={`text-xs ${
                isOrphaned ? 'text-red-500' : 'text-gray-500'
              }`}>
                {new Date(req.start_date!).toLocaleDateString()} - {new Date(req.end_date!).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Individual Positions */}
          <div className="p-2 space-y-1">
            {positions.map((position, posIndex) => renderPosition(position, posIndex, requirementPosition, isOrphaned))}
          </div>
        </div>
      </div>
    );
  };

  const renderPosition = (position: RequirementPosition, posIndex: number, requirementPosition: { left: number; width: number }, isOrphaned: boolean = false) => {
    const isHovered = hoveredPosition === position.id;
    const isAllocated = !!position.allocatedPerson;
    
    return (
      <Tooltip key={position.id}>
        <TooltipTrigger asChild>
          <div
            className={`relative h-6 border rounded transition-all duration-200 cursor-pointer ${
              isAllocated 
                ? 'bg-blue-200 border-blue-400' 
                : 'bg-white border-gray-400 border-dashed'
            } ${isHovered ? 'scale-105 shadow-md' : ''}`}
            onMouseEnter={() => setHoveredPosition(position.id)}
            onMouseLeave={() => setHoveredPosition(null)}
          >
            {isAllocated && position.allocatedPerson ? (
              // Show allocation within the requirement
              <div
                className="absolute h-full bg-blue-300 border border-blue-500 rounded"
                style={{
                  left: `${Math.max(0, calculateAllocationOffset(position, requirementPosition))}px`,
                  width: `${calculateAllocationWidth(position, requirementPosition)}px`,
                }}
              >
                <div className="flex items-center justify-between h-full px-2">
                  <span className="text-xs font-medium truncate">
                    {position.allocatedPerson.name} ({position.allocatedPerson.allocationPercentage}%)
                  </span>
                </div>
              </div>
            ) : (
              // Empty position
              <div className="flex items-center justify-between h-full px-2">
                <span className="text-xs text-gray-500">
                  Position {position.positionIndex + 1}
                </span>
                {isHovered && (
                  <div className="flex items-center space-x-1">
                    {onAllocatePosition && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAllocatePosition(position);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                    {onEditPosition && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPosition(position);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <div className="whitespace-pre-line">
              {isAllocated && position.allocatedPerson
                ? `${position.allocatedPerson.name}\n${position.roleTypeName}\n${position.allocatedPerson.allocationStartDate.toLocaleDateString()} - ${position.allocatedPerson.allocationEndDate.toLocaleDateString()}\n${position.allocatedPerson.allocationPercentage}% allocation`
                : `${position.roleTypeName} (Position ${position.positionIndex + 1})\n${position.startDate.toLocaleDateString()} - ${position.endDate.toLocaleDateString()}`
              }
            </div>
            <div className="flex items-center space-x-2 pt-1 border-t border-gray-600">
              {isOrphaned && position.allocatedPerson && onDeleteOrphanedAllocation ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-700 text-white hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteOrphanedAllocation(position.allocatedPerson!.allocationId);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              ) : (
                <>
                  {/* For allocated positions, show edit/delete allocation buttons */}
                  {isAllocated && position.allocatedPerson ? (
                    <>
                      {onEditAllocation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-blue-700 text-white hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Find the allocation object to pass to the handler
                            const allocation = allocations.find(a => a.id === position.allocatedPerson!.allocationId);
                            if (allocation) {
                              onEditAllocation(allocation);
                            }
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {onDeleteAllocation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-700 text-white hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAllocation(position.allocatedPerson!.allocationId);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  ) : (
                    /* For empty positions, show allocate/edit requirement buttons */
                    <>
                      {onAllocatePosition && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-green-700 text-white hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAllocatePosition(position);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                      {onEditPosition && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-blue-700 text-white hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPosition(position);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  // Calculate where allocation should appear within the requirement box
  const calculateAllocationOffset = (position: RequirementPosition, requirementPosition: { left: number; width: number }): number => {
    if (!position.allocatedPerson) return 0;
    
    const reqStart = position.startDate.getTime();
    const reqEnd = position.endDate.getTime();
    const allocStart = position.allocatedPerson.allocationStartDate.getTime();
    
    const reqDuration = reqEnd - reqStart;
    const offsetFromStart = Math.max(0, allocStart - reqStart);
    
    return (offsetFromStart / reqDuration) * requirementPosition.width;
  };

  const calculateAllocationWidth = (position: RequirementPosition, requirementPosition: { left: number; width: number }): number => {
    if (!position.allocatedPerson) return 0;
    
    const reqStart = position.startDate.getTime();
    const reqEnd = position.endDate.getTime();
    const allocStart = position.allocatedPerson.allocationStartDate.getTime();
    const allocEnd = position.allocatedPerson.allocationEndDate.getTime();
    
    const reqDuration = reqEnd - reqStart;
    const allocDuration = Math.min(allocEnd, reqEnd) - Math.max(allocStart, reqStart);
    
    return Math.max(20, (allocDuration / reqDuration) * requirementPosition.width);
  };

  const totalHeight = requirementsWithAllocations.reduce((acc, req) => {
    const blockHeight = Math.max(60, req.positions.length * 30 + 20);
    return acc + blockHeight + 32; // 32px margin (mb-8)
  }, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleNavigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {config.startDate.toLocaleDateString()} - {config.endDate.toLocaleDateString()}
              </span>
              <span className="text-xs">• Hover over positions to allocate or edit</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGranularityChange('week')}
                className={config.granularity === 'week' ? 'bg-primary text-primary-foreground' : ''}
              >
                Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGranularityChange('month')}
                className={config.granularity === 'month' ? 'bg-primary text-primary-foreground' : ''}
              >
                Month
              </Button>
            </div>
          </div>
          
          {/* Scrollable Timeline Container */}
          <div className="overflow-x-auto border rounded-lg">
            <div style={{ width: `${timelineWidth}px` }}>
              {/* Column Headers */}
              <div className="flex border-b border-gray-200 pb-2 bg-gray-50 sticky top-0 z-10">
                {columns.map((column, index) => (
                  <div
                    key={index}
                    className="text-center text-xs font-medium text-gray-600"
                    style={{ width: `${timelineWidth / columns.length}px` }}
                  >
                    {column.label}
                  </div>
                ))}
              </div>

              {/* Timeline Content */}
              <div 
                ref={timelineRef}
                className="relative bg-white"
                style={{ height: `${Math.max(totalHeight, 400)}px` }}
              >
                {/* Project Start/End Date Markers */}
                {projectStartDate && (
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-green-500 z-10"
                    style={{
                      left: `${calculateItemPosition(
                        { 
                          id: 'project-start', 
                          title: 'Project Start', 
                          startDate: projectStartDate, 
                          endDate: projectStartDate, 
                          type: 'requirement' 
                        },
                        config.startDate,
                        config.endDate,
                        timelineWidth
                      ).left}px`,
                    }}
                  />
                )}
                
                {projectEndDate && (
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10"
                    style={{
                      left: `${calculateItemPosition(
                        { 
                          id: 'project-end', 
                          title: 'Project End', 
                          startDate: projectEndDate, 
                          endDate: projectEndDate, 
                          type: 'requirement' 
                        },
                        config.startDate,
                        config.endDate,
                        timelineWidth
                      ).left}px`,
                    }}
                  />
                )}

                {requirementsWithAllocations.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-muted-foreground">
                    No requirements defined yet
                  </div>
                ) : (
                  <TooltipProvider>
                    {requirementsWithAllocations.map((reqWithAllocs, index) => 
                      renderRequirementBlock(reqWithAllocs, index)
                    )}
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
              <span className="text-xs">Requirement Block</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-white border border-gray-400 border-dashed rounded"></div>
              <span className="text-xs">Open Position</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-300 border border-blue-500 rounded"></div>
              <span className="text-xs">Allocated Person</span>
            </div>
            <div className="flex items-center space-x-2">
              <Plus className="h-4 w-4 text-green-600" />
              <span className="text-xs">Allocate (hover to see)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Edit className="h-4 w-4 text-blue-600" />
              <span className="text-xs">Edit (hover to see)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
