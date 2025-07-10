import { TimelineItem } from "./timeline";

export interface DragState {
  isDragging: boolean;
  draggedItem: TimelineItem | null;
  dragType: 'move' | 'resize-start' | 'resize-end' | null;
  startPosition: { x: number; y: number };
  originalItem: TimelineItem | null;
}

export interface DropResult {
  item: TimelineItem;
  newStartDate: Date;
  newEndDate: Date;
  isValid: boolean;
  conflicts: string[];
}

export function calculateNewDates(
  item: TimelineItem,
  dragType: 'move' | 'resize-start' | 'resize-end',
  deltaX: number,
  timelineStart: Date,
  timelineEnd: Date,
  timelineWidth: number
): { newStartDate: Date; newEndDate: Date } {
  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
  const pixelsPerDay = timelineWidth / totalDays;
  const daysDelta = Math.round(deltaX / pixelsPerDay);
  
  let newStartDate = new Date(item.startDate);
  let newEndDate = new Date(item.endDate);
  
  switch (dragType) {
    case 'move':
      newStartDate = new Date(item.startDate.getTime() + daysDelta * 24 * 60 * 60 * 1000);
      newEndDate = new Date(item.endDate.getTime() + daysDelta * 24 * 60 * 60 * 1000);
      break;
      
    case 'resize-start':
      newStartDate = new Date(item.startDate.getTime() + daysDelta * 24 * 60 * 60 * 1000);
      // Ensure start date doesn't go past end date
      if (newStartDate >= item.endDate) {
        newStartDate = new Date(item.endDate.getTime() - 24 * 60 * 60 * 1000);
      }
      break;
      
    case 'resize-end':
      newEndDate = new Date(item.endDate.getTime() + daysDelta * 24 * 60 * 60 * 1000);
      // Ensure end date doesn't go before start date
      if (newEndDate <= item.startDate) {
        newEndDate = new Date(item.startDate.getTime() + 24 * 60 * 60 * 1000);
      }
      break;
  }
  
  return { newStartDate, newEndDate };
}

export function validateDrop(
  item: TimelineItem,
  newStartDate: Date,
  newEndDate: Date,
  allItems: TimelineItem[],
  projectStartDate?: Date,
  projectEndDate?: Date
): { isValid: boolean; conflicts: string[] } {
  const conflicts: string[] = [];
  
  // Check if dates are within project bounds (if provided)
  if (projectStartDate && newStartDate < projectStartDate) {
    conflicts.push("Start date cannot be before project start date");
  }
  
  if (projectEndDate && newEndDate > projectEndDate) {
    conflicts.push("End date cannot be after project end date");
  }
  
  // Check for overlaps with other items (for allocations)
  if (item.type === 'allocation') {
    const otherAllocations = allItems.filter(
      other => other.id !== item.id && 
               other.type === 'allocation' && 
               other.metadata?.person_id === item.metadata?.person_id
    );
    
    for (const other of otherAllocations) {
      if (newStartDate < other.endDate && newEndDate > other.startDate) {
        conflicts.push(`Overlaps with allocation: ${other.title}`);
      }
    }
  }
  
  // Check for leave period conflicts
  if (item.type === 'allocation') {
    const leaveItems = allItems.filter(
      other => other.type === 'leave' && 
               other.metadata?.person_id === item.metadata?.person_id
    );
    
    for (const leave of leaveItems) {
      if (newStartDate < leave.endDate && newEndDate > leave.startDate) {
        conflicts.push(`Conflicts with leave period: ${leave.title}`);
      }
    }
  }
  
  // Validate minimum duration (at least 1 day)
  const durationDays = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24));
  if (durationDays < 1) {
    conflicts.push("Duration must be at least 1 day");
  }
  
  return {
    isValid: conflicts.length === 0,
    conflicts
  };
}

export function snapToGrid(
  date: Date,
  granularity: 'day' | 'week' | 'month' = 'day'
): Date {
  const snapped = new Date(date);
  
  switch (granularity) {
    case 'week':
      // Snap to Monday
      const dayOfWeek = snapped.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      snapped.setDate(snapped.getDate() + daysToMonday);
      snapped.setHours(0, 0, 0, 0);
      break;
      
    case 'month':
      // Snap to first day of month
      snapped.setDate(1);
      snapped.setHours(0, 0, 0, 0);
      break;
      
    case 'day':
    default:
      // Snap to start of day
      snapped.setHours(0, 0, 0, 0);
      break;
  }
  
  return snapped;
}

export function getDragCursor(dragType: 'move' | 'resize-start' | 'resize-end' | null): string {
  switch (dragType) {
    case 'move':
      return 'grabbing';
    case 'resize-start':
    case 'resize-end':
      return 'col-resize';
    default:
      return 'default';
  }
}

export function getHoverZone(
  mouseX: number,
  itemLeft: number,
  itemWidth: number
): 'start' | 'middle' | 'end' {
  const relativeX = mouseX - itemLeft;
  const resizeZoneWidth = Math.min(itemWidth * 0.2, 10); // 20% of width or 10px, whichever is smaller
  
  if (relativeX <= resizeZoneWidth) {
    return 'start';
  } else if (relativeX >= itemWidth - resizeZoneWidth) {
    return 'end';
  } else {
    return 'middle';
  }
}

export function formatDragFeedback(
  item: TimelineItem,
  newStartDate: Date,
  newEndDate: Date,
  isValid: boolean,
  conflicts: string[]
): string {
  const duration = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const startStr = newStartDate.toLocaleDateString();
  const endStr = newEndDate.toLocaleDateString();
  
  let feedback = `${item.title}\n${startStr} - ${endStr} (${duration} days)`;
  
  if (item.percentage) {
    feedback += `\n${item.percentage}% allocation`;
  }
  
  if (!isValid && conflicts.length > 0) {
    feedback += `\n\n⚠️ Issues:\n${conflicts.join('\n')}`;
  }
  
  return feedback;
}
