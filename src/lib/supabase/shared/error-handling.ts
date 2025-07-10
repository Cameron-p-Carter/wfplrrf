// Error handling utilities for database operations

export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public conflictType?: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Generic error handler for database operations
export function handleDatabaseError(error: any, operation: string): never {
  if (error?.code === 'PGRST116') {
    throw new ValidationError(`No rows found for ${operation}`);
  }
  
  if (error?.code === '23503') {
    throw new ConflictError(`Foreign key constraint violation in ${operation}`);
  }
  
  if (error?.code === '23505') {
    throw new ConflictError(`Unique constraint violation in ${operation}`);
  }
  
  throw new DatabaseError(
    error?.message || `Failed to ${operation}`,
    operation,
    error
  );
}

// Safe operation wrapper
export async function safeOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleDatabaseError(error, operationName);
  }
}