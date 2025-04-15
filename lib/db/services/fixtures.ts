// Simple service for interacting with the fixtures table in the database
import { Database } from '../../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, type ServiceResponse } from '../../types/service';

// Define helper type based on generated schema, it represents a row in the fixtures table
type Fixture = Database['public']['Tables']['fixtures']['Row'];

// Build a custom error class for fixture service
export class FixtureError extends ServiceError {
  constructor(
    message: string,
    // Using generic codes for now. Add more specific codes if needed later.
    code: 'NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'FixtureError';
  }
}

// Object that contains all the methods for the fixture service
export const fixtureServices = {

  // Find all fixtures from the database, can be extended with parameters for filtering (e.g., by season, gameweek)
  async findAllFixtures(
    supabase: SupabaseClient<Database>
    // Example: Add parameters here for filtering, e.g., season?: number
  ): Promise<ServiceResponse<Fixture[], FixtureError>> {
    try {
      // Start building the query
      const query = supabase // change this to let if we want to modify the query
        .from('fixtures')
        .select('*'); // Select all columns for now

      // --- Example Filtering (Uncomment and adapt if needed) ---
      // if (season) {
      //   query = query.eq('season', season);
      // }
      // if (gameweek) {
      //   query = query.eq('gameweek', gameweek);
      // }
      // Add ordering if desired
      // query = query.order('kickoff_time', { ascending: true });
      // --- End Example Filtering ---

      // Execute the query
      const { data, error } = await query;

      // Handle potential database errors during the query
      if (error) {
        console.error("Supabase error fetching fixtures:", error);
        throw new FixtureError(
          'Failed to fetch fixtures from database.',
          'DATABASE_ERROR',
          error
        );
      }

      // Return successful response with the data (or an empty array if null)
      return {
        data: data || [],
        error: null
      };

    } catch (err) {
      // Catch errors specifically thrown as FixtureError
      if (err instanceof FixtureError) {
        return { data: null, error: err };
      }
      // Catch any other unexpected errors
      console.error('Unexpected error in findAllFixtures service:', err);
      return {
        data: null,
        error: new FixtureError(
          'An unexpected error occurred while fetching fixtures.',
          'DATABASE_ERROR', // Default to DATABASE_ERROR for unexpected issues
          err
        )
      };
    }
  }

  // --- Future Service Methods ---
  // TODO: Add other read methods here later if needed, for example:
  // async findFixturesByGameweek(supabase: SupabaseClient<Database>, gameweek: number, season: number): Promise<ServiceResponse<Fixture[], FixtureError>> { ... }
  // async findFixtureById(supabase: SupabaseClient<Database>, id: string): Promise<ServiceResponse<Fixture, FixtureError>> { ... }
  // -----------------------------
};