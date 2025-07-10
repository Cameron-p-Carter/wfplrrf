"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar, Clock, Save, X } from "lucide-react";
import { toast } from "sonner";
import { 
  TimelineItem, 
  TimelineConfig, 
  generateTimelineColumns, 
  calculateItemPosition, 
  getTimelineItemColor, 
  groupTimelineItems 
} from "@/lib/utils/timeline";
import {
  DragState,
  DropResult,
  calculateNewDates,
  validateDrop,
  snapToGrid,
  getDragCursor,
  getHoverZone,
  formatDragFeedback
} from "@/lib/utils/drag-drop";

interface InteractiveTimelineProps {
  title: string;
  items: TimelineItem[];
  config: TimelineConfig;
  onItemClick?: (item: TimelineItem) => void;
  onConfigChange?: (config: TimelineConfig) => void;
  onItemUpdate?: (item: TimelineItem, newStartDate: Date, newEndDate: Date) => Promise<void>;
  onItemCreate?: (startDate: Date, endDate: Date, position: { x: number; y: number }) => void;
  className?: string;
  readOnly?: boolean;
  projectStartDate?: Date;
  projectEndDate?: Date;
  enableSnapping?: boolean;
  snapGranularity?: 'day' | 'week' | 'month';
}

export function InteractiveTimeline({ 
  title, 
  items, 
  config, 
  onItemClick, 
  onConfigChange, 
  onItemUpdate,
  onItemCreate,
  className,
  readOnly = false,
  projectStartDate,
  projectEndDate,
  enableSnapping = true,
  snapGranularity = 'day'
}: InteractiveTimelineProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragType: null,
    startPosition: { x: 0, y: 0 },
    originalItem: null,
  });
  
  const [previewItem, setPreviewItem] = useState<TimelineItem | null>(null);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; conflicts: string[] } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineWidth = 800;
  
  const columns = generateTimelineColumns(config);
  const groupedItems = groupTimelineItems(items);

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

  const getMousePosition = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return { x: 0, y: 0 };
    
    const rect = timelineRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, item: TimelineItem) => {
    if (readOnly || !onItemUpdate) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const mousePos = getMousePosition(e);
    const position = calculateItemPosition(item, config.startDate, config.endDate, timelineWidth);
    const hoverZone = getHoverZone(mousePos.x, position.left, position.width);
    
    let dragType: 'move' | 'resize-start' | 'resize-end';
    
    switch (hoverZone) {
      case 'start':
        dragType = 'resize-start';
        break;
      case 'end':
        dragType = 'resize-end';
        break;
      case 'middle':
      default:
        dragType = 'move';
        break;
    }
    
    setDragState({
      isDragging: true,
      draggedItem: item,
      dragType,
      startPosition: mousePos,
      originalItem: { ...item },
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [readOnly, onItemUpdate, getMousePosition, config, timelineWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedItem || !dragState.dragType) return;
    
    const currentPos = { x: e.clientX, y: e.clientY };
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      currentPos.x -= rect.left;
      currentPos.y -= rect.top;
    }
    
    const deltaX = currentPos.x - dragState.startPosition.x;
    
    const { newStartDate, newEndDate } = calculateNewDates(
      dragState.originalItem!,
      dragState.dragType,
      deltaX,
      config.startDate,
      config.endDate,
      timelineWidth
    );
    
    // Apply snapping if enabled
    const finalStartDate = enableSnapping ? snapToGrid(newStartDate, snapGranularity) : newStartDate;
    const finalEndDate = enableSnapping ? snapToGrid(newEndDate, snapGranularity) : newEndDate;
    
    // Validate the new position
    const validation = validateDrop(
      dragState.draggedItem,
      finalStartDate,
      finalEndDate,
      items,
      projectStartDate,
      projectEndDate
    );
    
    setValidationResult(validation);
    
    // Update preview item
    setPreviewItem({
      ...dragState.draggedItem,
      startDate: finalStartDate,
      endDate: finalEndDate,
    });
    
  }, [dragState, config, timelineWidth, items, projectStartDate, projectEndDate, enableSnapping, snapGranularity]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState.isDragging || !dragState.draggedItem || !previewItem || !onItemUpdate) {
      resetDragState();
      return;
    }
    
    if (validationResult?.isValid) {
      try {
        setIsUpdating(true);
        await onItemUpdate(dragState.draggedItem, previewItem.startDate, previewItem.endDate);
        toast.success("Timeline item updated successfully");
      } catch (error) {
        toast.error("Failed to update timeline item");
        console.error("Update error:", error);
      } finally {
        setIsUpdating(false);
      }
    } else {
      toast.error("Invalid position: " + (validationResult?.conflicts.join(", ") || "Unknown error"));
    }
    
    resetDragState();
  }, [dragState, previewItem, validationResult, onItemUpdate]);

  const resetDragState = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragType: null,
      startPosition: { x: 0, y: 0 },
      originalItem: null,
    });
    setPreviewItem(null);
    setValidationResult(null);
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (readOnly || !onItemCreate || dragState.isDragging) return;
    
    const mousePos = getMousePosition(e);
    
    // Calculate the date at the click position
    const totalDays = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const pixelsPerDay = timelineWidth / totalDays;
    const dayOffset = Math.floor(mousePos.x / pixelsPerDay);
    
    const clickDate = new Date(config.startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const endDate = new Date(clickDate.getTime() + 24 * 60 * 60 * 1000); // Default 1 day duration
    
    onItemCreate(clickDate, endDate, mousePos);
  }, [readOnly, onItemCreate, dragState.isDragging, getMousePosition, config, timelineWidth]);

  const getCursor = useCallback((item: TimelineItem, mouseX: number) => {
    if (readOnly || !onItemUpdate) return 'default';
    if (dragState.isDragging) return getDragCursor(dragState.dragType);
    
    const position = calculateItemPosition(item, config.startDate, config.endDate, timelineWidth);
    const hoverZone = getHoverZone(mouseX, position.left, position.width);
    
    switch (hoverZone) {
      case 'start':
      case 'end':
        return 'col-resize';
      case 'middle':
        return 'grab';
      default:
        return 'default';
    }
  }, [readOnly, onItemUpdate, dragState, config, timelineWidth]);

  const renderTimelineItem = (item: TimelineItem, rowIndex: number) => {
    const isBeingDragged = dragState.draggedItem?.id === item.id;
    const displayItem = isBeingDragged && previewItem ? previewItem : item;
    
    const position = calculateItemPosition(
      displayItem,
      config.startDate,
      config.endDate,
      timelineWidth
    );
    
    const colorClass = getTimelineItemColor(displayItem.type, displayItem.percentage);
    const isInvalid = isBeingDragged && validationResult && !validationResult.isValid;
    
    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>
          <div
            className={`absolute h-6 border-2 rounded transition-all duration-200 select-none ${colorClass} ${
              isBeingDragged ? 'scale-105 shadow-lg z-20' : 'z-10'
            } ${isInvalid ? 'border-red-500 bg-red-100' : ''} ${
              !readOnly && onItemUpdate ? 'hover:scale-105 hover:shadow-md' : ''
            }`}
            style={{
              left: `${position.left}px`,
              width: `${Math.max(position.width, 20)}px`,
              cursor: getCursor(item, position.left + position.width / 2),
            }}
            onMouseDown={(e) => handleMouseDown(e, item)}
            onClick={(e) => {
              e.stopPropagation();
              if (!dragState.isDragging && onItemClick) {
                onItemClick(item);
              }
            }}
          >
            <div className="px-1 py-0.5 text-xs font-medium truncate">
              {displayItem.title}
              {displayItem.percentage && (
                <span className="ml-1">({displayItem.percentage}%)</span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line">
            {isBeingDragged && previewItem && validationResult ? 
              formatDragFeedback(previewItem, previewItem.startDate, previewItem.endDate, validationResult.isValid, validationResult.conflicts) :
              `${item.title}\n${item.startDate.toLocaleDateString()} - ${item.endDate.toLocaleDateString()}`
            }
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{title}</span>
            {dragState.isDragging && (
              <Badge variant="secondary" className="ml-2">
                Dragging...
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {dragState.isDragging && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetDragState}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                {validationResult?.isValid && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleMouseUp}
                    disabled={isUpdating}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? "Saving..." : "Save"}
                  </Button>
                )}
              </div>
            )}
            
            {!dragState.isDragging && (
              <>
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
                <div className="flex items-center space-x-1">
                  <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleNavigate('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline Header */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {config.startDate.toLocaleDateString()} - {config.endDate.toLocaleDateString()}
            </span>
            {!readOnly && onItemCreate && (
              <span className="text-xs">• Click empty space to create new item</span>
            )}
            {!readOnly && onItemUpdate && (
              <span className="text-xs">• Drag items to move or resize</span>
            )}
          </div>
          
          {/* Column Headers */}
          <div className="relative">
            <div className="flex border-b border-gray-200 pb-2">
              {columns.map((column, index) => (
                <div
                  key={index}
                  className="flex-1 text-center text-xs font-medium text-gray-600"
                  style={{ minWidth: `${timelineWidth / columns.length}px` }}
                >
                  {column.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Content */}
          <div 
            ref={timelineRef}
            className="relative cursor-crosshair"
            style={{ 
              minHeight: `${Math.max(groupedItems.length * 40, 80)}px`,
              cursor: dragState.isDragging ? getDragCursor(dragState.dragType) : 'default'
            }}
            onClick={handleTimelineClick}
          >
            {groupedItems.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                No timeline items to display
                {!readOnly && onItemCreate && (
                  <span className="ml-2 text-sm">• Click to create one</span>
                )}
              </div>
            ) : (
              <TooltipProvider>
                {groupedItems.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="relative"
                    style={{ 
                      height: '32px', 
                      marginBottom: '8px',
                      top: `${rowIndex * 40}px`
                    }}
                  >
                    {row.map((item) => renderTimelineItem(item, rowIndex))}
                  </div>
                ))}
              </TooltipProvider>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-200 border-2 border-blue-400 rounded"></div>
              <span className="text-xs">Requirements</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-200 border-2 border-green-400 rounded"></div>
              <span className="text-xs">High Allocation (≥80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-400 rounded"></div>
              <span className="text-xs">Low Allocation (&lt;80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 border-2 border-red-400 rounded"></div>
              <span className="text-xs">Over-allocation (&gt;100%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-200 border-2 border-purple-400 rounded"></div>
              <span className="text-xs">Leave</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 border-dashed rounded"></div>
              <span className="text-xs">Gaps</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
