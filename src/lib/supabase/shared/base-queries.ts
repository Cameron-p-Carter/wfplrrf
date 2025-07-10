import { createClient } from "../client";

// Shared Supabase client instance
export const supabase = createClient();

// Generic CRUD operations interface
export interface CrudQueries<T, TInsert = any, TUpdate = any> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T>;
  create: (item: TInsert) => Promise<T>;
  update: (id: string, item: TUpdate) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

// Generic error handling
export function handleQueryError(error: any, operation: string): never {
  console.error(`Error in ${operation}:`, error);
  throw error;
}

// Generic list sorting helper
export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// Generic date range filter helper
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

// Generic overlap detection helper
export function hasDateOverlap(
  start1: Date, end1: Date, 
  start2: Date, end2: Date
): boolean {
  return start1 <= end2 && end1 >= start2;
}