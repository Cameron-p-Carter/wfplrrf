// Main timeline component
export { ProjectTimeline } from "./ProjectTimeline";

// Sub-components (exported for potential reuse)
export { TimelineHeader } from "./TimelineHeader";
export { TimelineControls } from "./TimelineControls";
export { TimelineGrid } from "./TimelineGrid";
export { RequirementBlock } from "./RequirementBlock";
export { PositionSlot } from "./PositionSlot";
export { AllocationBar } from "./AllocationBar";
export { TimelineLegend } from "./TimelineLegend";

// Types
export type { 
  RequirementWithAllocations, 
  RequirementPosition, 
  TimelineCallbacks, 
  TimelineProps,
  AllocationPosition
} from "./types";

// Services
export { TimelineDataService } from "../../../lib/services/TimelineDataService";