/* eslint-disable @typescript-eslint/no-explicit-any */
// import { SupabaseClient } from '@supabase/supabase-js'; // Not strictly needed for mock type
// import { Database } from '../types/supabase'; // Not strictly needed for mock type
import { ServiceError } from '../types/service'; // Assuming ServiceError type exists

// Keep the mock type simple but functional
export type MockSupabaseClient = {
  from: jest.Mock<MockQueryBuilder, [string]>;
  // Add mocks for other top-level client properties/methods if needed (e.g., auth)
};

// Define the methods expected on the object returned by .from()
interface MockQueryBuilder {
  select: jest.Mock<this, [string?]>;
  insert: jest.Mock<this, [any[] | any]>;
  upsert: jest.Mock<this, [any[] | any]>;
  update: jest.Mock<this, [any]>;
  delete: jest.Mock<this, []>;
  eq: jest.Mock<this, [string, any]>;
  neq: jest.Mock<this, [string, any]>;
  gt: jest.Mock<this, [string, any]>;
  gte: jest.Mock<this, [string, any]>;
  lt: jest.Mock<this, [string, any]>;
  lte: jest.Mock<this, [string, any]>;
  like: jest.Mock<this, [string, string]>;
  ilike: jest.Mock<this, [string, string]>;
  is: jest.Mock<this, [string, any]>;
  in: jest.Mock<this, [string, any[]]>;
  contains: jest.Mock<this, [string, any]>;
  containedBy: jest.Mock<this, [string, any]>;
  range: jest.Mock<this, [number, number]>;
  order: jest.Mock<this, [string, any?]>;
  limit: jest.Mock<this, [number]>;
  match: jest.Mock<this, [Record<string, unknown>]>;
  single: jest.Mock<Promise<{ data: any; error: any }>, []>;
  maybeSingle: jest.Mock<Promise<{ data: any; error: any }>, []>;
  // Mock .then() to allow awaiting the builder directly
  // The return type needs to match the expected promise structure
  then: jest.Mock<Promise<{ data: any; error: any }>, [(resolve: (value: { data: any; error: any }) => void, reject?: (reason?: any) => void) => void | PromiseLike<any>]>;
  // Add any other Supabase methods you use
}

export const createMockSupabase = (): MockSupabaseClient => {
  const queryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }), // Default promise
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), // Default promise
    // Default promise for direct await - returns a structure tests might expect
    then: jest.fn().mockImplementation(async (resolve) => {
      // Default resolution simulates a successful query returning an empty array
      if (resolve) {
        resolve({ data: [], error: null });
      }
      // Return a promise that resolves to the default value
      return Promise.resolve({ data: [], error: null });
    }),
  };

  const client: MockSupabaseClient = {
    from: jest.fn().mockReturnValue(queryBuilder),
  };

  return client;
};

// Simple helper to create a successful response structure
export const createSuccessResponse = <T>(data: T): { data: T; error: null } => ({
  data,
  error: null,
});

// Simple helper to create an error response structure
export const createErrorResponse = (error: ServiceError | Error | any): { data: null; error: any } => ({
  data: null,
  error,
});