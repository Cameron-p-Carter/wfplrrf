"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Edit, Trash2 } from "lucide-react";
import { calculateItemPosition } from "@/lib/utils/timeline";
import type { RequirementWithAllocations, TimelineCallbacks } from "./types";
import type { TimelineConfig } from "@/lib/utils/timeline";
import type { Tables } from "@/types/supabase";
import { PositionSlot } from "./PositionSlot";

interface RequirementBlockProps {
  reqWithAllocs: RequirementWithAllocations;
  blockIndex: number;
  config: TimelineConfig;
  timelineWidth: number;
  allocations: Tables<"project_allocations_detailed">[];
  callbacks: TimelineCallbacks;
}

export function RequirementBlock({ 
  reqWithAllocs, 
  blockIndex, 
  config, 
  timelineWidth,
  allocations,
  callbacks 
}: RequirementBlockProps) {
  const [hoveredRequirement, setHoveredRequirement] = useState<string | null>(null);
  
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

  const blockHeight = Math.max(80, positions.length * 40 + 30);
  const topMargin = blockIndex === 0 ? 20 : 0;

  const handleEditRequirement = (e: React.MouseEvent) => {
    e.stopPropagation();
    callbacks.onEditRequirement?.(req);
  };

  const handleDeleteRequirement = (e: React.MouseEvent) => {
    e.stopPropagation();
    callbacks.onDeleteRequirement?.(req);
  };

  return (
    <div
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
                    {callbacks.onEditRequirement && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-blue-200"
                        onClick={handleEditRequirement}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {callbacks.onDeleteRequirement && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-red-200"
                        onClick={handleDeleteRequirement}
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
          <TooltipProvider>
            {positions.map((position, posIndex) => (
              <PositionSlot
                key={position.id}
                position={position}
                positionIndex={posIndex}
                requirementPosition={requirementPosition}
                isOrphaned={isOrphaned}
                allocations={allocations}
                callbacks={callbacks}
              />
            ))}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}