// This file is a service file for interacting with the competitions data in Supabase

// 1. findCompetitionById
// 2. findActiveCompetitions
// 3. createCompetition
// 4. checkIfCompetitionEntryRequiresPayment

import { Database } from '../../../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, type ServiceResponse } from '../../../types/service';

// Define helper types based on generated ones
type Competition = Database['public']['Tables']['competitions']['Row'];
type Round = Database['public']['Tables']['rounds']['Row'];
type CompetitionCreateData = Database['public']['Tables']['competitions']['Insert'];

// Export this type so it can be used elsewhere
export type CompetitionWithRounds = Competition & {
  rounds: Round[];
};

// Type for the data returned by checkIfEntryRequiresPayment
export type CompetitionEntryRequirementDetails = {
  entryFee: number;
  paymentType: 'free_entry' | 'paid_entry';
};

// Extend base ServiceError for competition-specific errors
export class CompetitionError extends ServiceError {
  constructor(
    message: string,
    code: 'NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'CompetitionError';
  }
}

// Object that contains all the methods for the competition service
export const competitionServices = {
  // Find a competition by its id, it'll also return its rounds, null if not found
  async findCompetitionById(
    supabase: SupabaseClient<Database>, 
    id: string
  ): Promise<ServiceResponse<CompetitionWithRounds, CompetitionError>> {
    try {
      const { data, error } = await supabase
        .from('competitions') // from the competitions table
        .select('*, rounds(*)') // select the competition and its rounds
        .eq('id', id) // where the id matches the id passed in
        .single(); // return a single row

      if (error) {
        throw new CompetitionError(
          'Failed to fetch competition',
          'DATABASE_ERROR',
          error
        );
      }

      if (!data) {
        throw new CompetitionError(
          `Competition with ID ${id} not found`,
          'NOT_FOUND'
        );
      }

      return {
        data: { ...data, rounds: data.rounds || [] },
        error: null
      };
    } catch (err) {
      if (err instanceof CompetitionError) {
        return { data: null, error: err };
      }
      // Handle unexpected errors
      return {
        data: null,
        error: new CompetitionError(
          'An unexpected error occurred',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },
// Finds all active competitions, including their rounds, returns empty array if not found
  async findActiveCompetitions(
    supabase: SupabaseClient<Database>
  ): Promise<ServiceResponse<CompetitionWithRounds[], CompetitionError>> {
    try {
      const { data, error } = await supabase
        .from('competitions') // from the competitions table  
        .select('*, rounds(*)') // select the competition and its rounds
        .eq('status', 'active'); // where the status is active

      if (error) {
        throw new CompetitionError(
          'Failed to fetch active competitions',
          'DATABASE_ERROR',
          error
        );
      }

      return {
        data: data?.map(comp => ({ ...comp, rounds: comp.rounds || [] })) || [],
        error: null
      };
    } catch (err) {
      if (err instanceof CompetitionError) {
        return { data: null, error: err };
      }
      return {
        data: null,
        error: new CompetitionError(
          'An unexpected error occurred while fetching competitions',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },
// Creates a new competition, will validate the data and return the created competition or an error
  async createCompetition( // takes in the supabase client and the competition data
    supabase: SupabaseClient<Database>, 
    competitionData: CompetitionCreateData
  ): Promise<ServiceResponse<Competition, CompetitionError>> {
    try {
      // Start by validating the data with a check for the title
      if (!competitionData.title) {
        throw new CompetitionError(
          'Competition title is required',
          'VALIDATION_ERROR'
        );
      }

      // Insert the competition data into the competitions table
      const { data, error } = await supabase
        .from('competitions') // from the competitions table
        .insert([competitionData])
        .select()
        .single();

      if (error) {
        throw new CompetitionError(
          'Failed to create competition',
          'DATABASE_ERROR',
          error
        );
      }

      return { data, error: null };
    } catch (err) {
      if (err instanceof CompetitionError) {
        return { data: null, error: err };
      }
      return {
        data: null,
        error: new CompetitionError(
          'An unexpected error occurred while creating competition',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },
  // simple method to check if a competition entry requires payment
  async checkIfCompetitionEntryRequiresPayment(
    supabase: SupabaseClient<Database>,
    competitionId: string
  ): Promise<ServiceResponse<CompetitionEntryRequirementDetails, CompetitionError>> {
    try {
      const { data: competition, error: dbError } = await supabase
        .from('competitions')
        .select('entry_fee')
        .eq('id', competitionId)
        .single();

      if (dbError) {
        if (dbError.code === 'PGRST116') { // PostgREST code for "No rows found"
          throw new CompetitionError(
            `Competition with ID ${competitionId} not found.`,
            'NOT_FOUND',
            dbError
          );
        }
        throw new CompetitionError(
          'Failed to fetch competition details.',
          'DATABASE_ERROR',
          dbError
        );
      }

      if (!competition) {
        throw new CompetitionError(
          `Competition with ID ${competitionId} not found (unexpectedly no data after successful query).`,
          'NOT_FOUND'
        );
      }

      const entryFee = competition.entry_fee || 0;
      const paymentType = entryFee === 0 ? 'free_entry' : 'paid_entry';
      
      return { data: { entryFee, paymentType }, error: null };
    } catch (err) {
      if (err instanceof CompetitionError) {
        return { data: null, error: err };
      }
      console.error('Unexpected error in checkIfEntryRequiresPayment:', err);
      return {
        data: null,
        error: new CompetitionError(
          'An unexpected error occurred while checking if entry requires payment.',
          'DATABASE_ERROR',
          err
        )
      };
    }
  }
};
