// Re-export all query modules
export * from "./queries/projects";
export * from "./queries/people";
export * from "./queries/role-types";
export * from "./queries/allocations";
export * from "./queries/requirements";
export * from "./queries/leave";

// Re-export business logic modules
export * from "./business-logic/auto-generation";
export * from "./business-logic/leave-management";
export * from "./business-logic/gap-analysis";

// Re-export shared utilities
export * from "./shared/base-queries";
export * from "./shared/error-handling";
export * from "./shared/crud-factory";

// Re-export client
export { createClient } from "./client";
export { supabase } from "./shared/base-queries";