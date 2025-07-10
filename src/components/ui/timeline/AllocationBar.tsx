"use client";

import type { RequirementPosition, AllocationPosition } from "./types";
import { TimelineDataService } from "../../../lib/services/TimelineDataService";

interface AllocationBarProps {
  position: RequirementPosition;
  requirementPosition: { left: number; width: number };
}

export function AllocationBar({ position, requirementPosition }: AllocationBarProps) {
  if (!position.allocatedPerson) return null;

  const offset = TimelineDataService.calculateAllocationOffset(position, requirementPosition);
  const width = TimelineDataService.calculateAllocationWidth(position, requirementPosition);

  return (
    <div
      className="absolute h-full bg-blue-300 border border-blue-500 rounded"
      style={{
        left: `${Math.max(0, offset)}px`,
        width: `${width}px`,
      }}
    >
      <div className="flex items-center justify-between h-full px-2">
        <span className="text-xs font-medium truncate">
          {position.allocatedPerson.name} ({position.allocatedPerson.allocationPercentage}%)
        </span>
      </div>
    </div>
  );
}