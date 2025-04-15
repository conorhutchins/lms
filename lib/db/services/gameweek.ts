// Service file for interacting with the gameweeks table in Supabase

// 1. upsertGameweek - upsert a single gameweek record into the database
// 2. findGameweeks - able to filter by league and season

import { Database } from '../../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, type ServiceResponse } from '../../types/service';

// Create helper types based on generated schema
type Gameweek = Database['public']['Tables']['gameweeks']['Row'];
type GameweekInsert = Database['public']['Tables']['gameweeks']['Insert'];

// Make a specific error class for gameweek service
export class GameweekError extends ServiceError {
  constructor(
    message: string,
    code: 'NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'GameweekError';
  }
}

// Object containing all the methods for gameweek interactions

export const gameweekServices = {

  /**
   * Upserts a single gameweek record into the database.
   * Uses 'id' as the conflict target.
   */
  async upsertGameweek(
    supabase: SupabaseClient<Database>,
    gameweekData: GameweekInsert
  ): Promise<ServiceResponse<Gameweek, GameweekError>> {
    // Basic validation (add more if needed)
    if (!gameweekData.id) {
       return {
        data: null,
        error: new GameweekError('Gameweek ID is required for upsert.', 'VALIDATION_ERROR')
      };
    }

    try {
      const { data, error } = await supabase
        .from('gameweeks')
        .upsert(gameweekData, {
          onConflict: 'id', // Specify the conflict target column
          // Removed `returning: 'minimal'` as we want the row back
        })
        .select() // Select the upserted row
        .single(); // Expect a single row back

      // Handle potential database errors during the upsert
      if (error) {
        console.error("Supabase error upserting gameweek:", error);
        throw new GameweekError(
          'Failed to upsert gameweek data.',
          'DATABASE_ERROR',
          error
        );
      }

      // Handle case where upsert succeeds but doesn't return data (shouldn't happen with .select().single())
       if (!data) {
         console.error("Upsert successful but no data returned for gameweek ID:", gameweekData.id);
         throw new GameweekError(
           'Upsert succeeded but failed to return the gameweek data.',
           'DATABASE_ERROR'
         );
       }

      // Return successful response with the upserted gameweek data
      return {
        data: data, // data here is the upserted Gameweek row
        error: null
      };

    } catch (err) {
      // Catch errors specifically thrown as GameweekError
      if (err instanceof GameweekError) {
        return { data: null, error: err };
      }
      // Catch any other unexpected errors
      console.error('Unexpected error in upsertGameweek service:', err);
      return {
        data: null,
        error: new GameweekError(
          'An unexpected error occurred while upserting gameweek data.',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },

  /**
   * Fetches gameweeks, optionally filtering by league and season.
   * Orders by gameweek number ascending.
   */
  async findGameweeks(
    supabase: SupabaseClient<Database>,
    filters?: {
      leagueId?: number;
      season?: number;
      // Add other filters like is_current, is_next etc. if needed
    }
  ): Promise<ServiceResponse<Gameweek[], GameweekError>> {
    try {
      let query = supabase
        .from('gameweeks')
        .select('*')
        .order('gameweek_number', { ascending: true });

      // Apply filters if provided
      if (filters?.leagueId) {
        query = query.eq('league_id', filters.leagueId);
      }
      if (filters?.season) {
        query = query.eq('season', filters.season);
      }
      // Example: query = query.eq('is_current', true);

      // Execute the query
      const { data, error } = await query;

      // Handle potential database errors
      if (error) {
        console.error("Supabase error fetching gameweeks:", error);
        throw new GameweekError(
          'Failed to fetch gameweeks.',
          'DATABASE_ERROR',
          error
        );
      }

      // Return successful response
      return {
        data: data || [],
        error: null
      };

    } catch (err) {
      // Catch known GameweekErrors
      if (err instanceof GameweekError) {
        return { data: null, error: err };
      }
      // Catch unexpected errors
      console.error('Unexpected error in findGameweeks service:', err);
      return {
        data: null,
        error: new GameweekError(
          'An unexpected error occurred while fetching gameweeks.',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },

  // --- Potential Future Service Methods We Might Want To Do---
  // async findCurrentGameweek(supabase: SupabaseClient<Database>): Promise<ServiceResponse<Gameweek, GameweekError>> { ... }
  // async findGameweekById(supabase: SupabaseClient<Database>, id: number): Promise<ServiceResponse<Gameweek, GameweekError>> { ... }
  // -----------------------------
};