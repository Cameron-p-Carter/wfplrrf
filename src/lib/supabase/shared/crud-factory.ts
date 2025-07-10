import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

// Generic CRUD operations interface
export interface CrudOperations<T, TInsert = any, TUpdate = any> {
  getAll: () => Promise<T[]>;
  getById?: (id: string) => Promise<T>;
  create: (item: TInsert) => Promise<T>;
  update: (id: string, item: TUpdate) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

// Generic CRUD hook factory
export function createCrudHook<T extends { id: string }, TInsert = any, TUpdate = any>(
  entityName: string,
  operations: CrudOperations<T, TInsert, TUpdate>,
  options?: {
    sortBy?: keyof T;
    onAfterCreate?: (item: T) => void;
    onAfterUpdate?: (item: T) => void;
    onAfterDelete?: (id: string) => void;
    refetchOnCreateUpdate?: boolean;
  }
) {
  return function useCrudHook() {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await operations.getAll();
        
        // Sort if specified
        if (options?.sortBy) {
          const sortKey = options.sortBy as string;
          data.sort((a, b) => {
            const aValue = (a as any)[sortKey];
            const bValue = (b as any)[sortKey];
            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return aValue.localeCompare(bValue);
            }
            return 0;
          });
        }
        
        setItems(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to fetch ${entityName}`;
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchItems();
    }, []);

    const create = async (item: TInsert) => {
      try {
        const newItem = await operations.create(item);
        
        if (options?.refetchOnCreateUpdate) {
          await fetchItems();
        } else {
          setItems(prev => {
            const updated = [...prev, newItem];
            if (options?.sortBy) {
              const sortKey = options.sortBy as string;
              updated.sort((a, b) => {
                const aValue = (a as any)[sortKey];
                const bValue = (b as any)[sortKey];
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                  return aValue.localeCompare(bValue);
                }
                return 0;
              });
            }
            return updated;
          });
        }
        
        options?.onAfterCreate?.(newItem);
        toast.success(`${entityName} created successfully`);
        return newItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to create ${entityName}`;
        toast.error(message);
        throw err;
      }
    };

    const update = async (id: string, item: TUpdate) => {
      try {
        const updatedItem = await operations.update(id, item);
        
        if (options?.refetchOnCreateUpdate) {
          await fetchItems();
        } else {
          setItems(prev => {
            const updated = prev.map(i => i.id === id ? updatedItem : i);
            if (options?.sortBy) {
              const sortKey = options.sortBy as string;
              updated.sort((a, b) => {
                const aValue = (a as any)[sortKey];
                const bValue = (b as any)[sortKey];
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                  return aValue.localeCompare(bValue);
                }
                return 0;
              });
            }
            return updated;
          });
        }
        
        options?.onAfterUpdate?.(updatedItem);
        toast.success(`${entityName} updated successfully`);
        return updatedItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to update ${entityName}`;
        toast.error(message);
        throw err;
      }
    };

    const remove = async (id: string) => {
      try {
        await operations.delete(id);
        setItems(prev => prev.filter(i => i.id !== id));
        options?.onAfterDelete?.(id);
        toast.success(`${entityName} deleted successfully`);
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to delete ${entityName}`;
        toast.error(message);
        throw err;
      }
    };

    return {
      items,
      loading,
      error,
      create,
      update,
      remove,
      refetch: fetchItems,
    };
  };
}

// Common sorting utilities
export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export function sortByDate<T extends { created_at: string }>(items: T[]): T[] {
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}