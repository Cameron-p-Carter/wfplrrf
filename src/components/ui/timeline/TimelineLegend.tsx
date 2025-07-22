"use client";

import { Plus, Edit } from "lucide-react";

export function TimelineLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
        <span className="text-xs">Requirement Block</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 border-dashed rounded auto-gen-leave-coverage"></div>
        <span className="text-xs">Auto-generated (Leave Coverage)</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 border-dashed rounded auto-gen-partial-gap"></div>
        <span className="text-xs">Auto-generated (Partial Gap)</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded opacity-50 auto-gen-leave-coverage"></div>
        <span className="text-xs">Auto-generated (Ignored)</span>
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
  );
}