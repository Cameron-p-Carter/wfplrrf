"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { RequirementPosition, TimelineCallbacks } from "./types";
import type { Tables } from "@/types/supabase";
import { AllocationBar } from "./AllocationBar";

interface PositionSlotProps {
  position: RequirementPosition;
  positionIndex: number;
  requirementPosition: { left: number; width: number };
  isOrphaned?: boolean;
  allocations: Tables<"project_allocations_detailed">[];
  callbacks: TimelineCallbacks;
}

export function PositionSlot({ 
  position, 
  positionIndex, 
  requirementPosition, 
  isOrphaned = false, 
  allocations,
  callbacks 
}: PositionSlotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isAllocated = !!position.allocatedPerson;

  const handleAllocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    callbacks.onAllocatePosition?.(position);
  };

  const handleEditPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    callbacks.onEditPosition?.(position);
  };

  const handleEditAllocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allocation = allocations.find(a => a.id === position.allocatedPerson!.allocationId);
    if (allocation) {
      callbacks.onEditAllocation?.(allocation);
    }
  };

  const handleDeleteAllocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOrphaned) {
      callbacks.onDeleteOrphanedAllocation?.(position.allocatedPerson!.allocationId);
    } else {
      callbacks.onDeleteAllocation?.(position.allocatedPerson!.allocationId);
    }
  };

  const tooltipContent = isAllocated && position.allocatedPerson
    ? `${position.allocatedPerson.name}\n${position.roleTypeName}\n${position.allocatedPerson.allocationStartDate.toLocaleDateString('en-AU')} - ${position.allocatedPerson.allocationEndDate.toLocaleDateString('en-AU')}\n${position.allocatedPerson.allocationPercentage}% allocation`
    : `${position.roleTypeName} (Position ${position.positionIndex + 1})\n${position.startDate.toLocaleDateString('en-AU')} - ${position.endDate.toLocaleDateString('en-AU')}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative h-6 border rounded transition-all duration-200 cursor-pointer ${
            isAllocated 
              ? 'bg-blue-200 border-blue-400' 
              : 'bg-white border-gray-400 border-dashed'
          } ${isHovered ? 'scale-105 shadow-md' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isAllocated ? (
            <AllocationBar position={position} requirementPosition={requirementPosition} />
          ) : (
            <div className="flex items-center justify-between h-full px-2">
              <span className="text-xs text-gray-500">
                Allocate
              </span>
              {isHovered && (
                <div className="flex items-center space-x-1">
                  {callbacks.onAllocatePosition && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-green-100"
                      onClick={handleAllocate}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                  {callbacks.onEditPosition && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-blue-100"
                      onClick={handleEditPosition}
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
            {tooltipContent}
          </div>
          <div className="flex items-center space-x-2 pt-1 border-t border-gray-600">
            {isOrphaned && position.allocatedPerson ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-700 text-white hover:text-white"
                onClick={handleDeleteAllocation}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            ) : (
              <>
                {isAllocated && position.allocatedPerson ? (
                  <>
                    {callbacks.onEditAllocation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-blue-700 text-white hover:text-white"
                        onClick={handleEditAllocation}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {callbacks.onDeleteAllocation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-700 text-white hover:text-white"
                        onClick={handleDeleteAllocation}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {callbacks.onAllocatePosition && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-green-700 text-white hover:text-white"
                        onClick={handleAllocate}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                    {callbacks.onEditPosition && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-blue-700 text-white hover:text-white"
                        onClick={handleEditPosition}
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
}