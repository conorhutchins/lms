import { Database } from '../../../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, type ServiceResponse } from '../../../types/service';

// Define helper types from database schema
type Pick = Database['public']['Tables']['picks']['Row']; // full pick type
type PickInsert = Database['public']['Tables']['picks']['Insert']; // type for inserting a pick
type PickUpdate = Database['public']['Tables']['picks']['Update']; // type for updating a pick

// Custom error class for pick errors
export class PickError extends ServiceError {
  constructor(
    message: string,
    code: 'NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR' | 'PICK_LOCKED' | 'ALREADY_PICKED_TEAM_THIS_COMP', // Added potential error codes
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'PickError';
  }
}

// Service object with methods inside
// 1. pickService.findUserPickForRound - grab users pick for a specific round
// 2. pickService.findTeamUuidByExternalId - grab a team's internal UUID in database using its external API ID
// 3. pickService.saveUserPick - save or update a user's pick for a single round
// 4. pickService.savePicks - save or update multiple picks across rounds for a user
// 5. pickService.getUserPicksForRound - grab a users pick for a single round
// 6. pickService.getUserPicksForRounds - grab a user's picks for multiple rounds
// 7. pickService.updatePicksToLocked - change the status of picks to locked if the round deadline has passed
// 8. pickService.getRoundPicks - grab all picks for a specific round
export const pickServices = {
// grab users pick for a specific round
  async findUserPickForRound(
    supabase: SupabaseClient<Database>,
    userId: string,
    roundId: string
  ): Promise<ServiceResponse<Pick | null, PickError>> { // Return type allows null data
    try {
      // quick validation
      if (!userId) {
        throw new PickError('User ID is required.', 'VALIDATION_ERROR');
      }
      if (!roundId) {
        throw new PickError('Round ID is required.', 'VALIDATION_ERROR');
      }

      // find the pick
      const { data, error } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', userId)
        .eq('round_id', roundId)
        .maybeSingle(); // returns null if no pick is found

      // handle errors
      if (error) {
        // don't treat 'no rows' as an error as it is expected in some cases
        if (error.code !== 'PGRST116') {
           throw new PickError('Failed to fetch user pick.', 'DATABASE_ERROR', error);
        }
      }

      // return the pick or null if no pick is found
      return { data, error: null };

    } catch (err) {
      // handle our pick errors
      if (err instanceof PickError) {
        return { data: null, error: err };
      }
      console.error("Unexpected error in findUserPickForRound:", err);
      return {
        data: null,
        error: new PickError('An unexpected error occurred fetching pick.', 'DATABASE_ERROR', err)
      };
    }
  },

// find a team's internal UUID in our database by its external API ID from Football API we're using
  async findTeamUuidByExternalId(
    supabase: SupabaseClient<Database>,
    externalTeamId: string | number // external API team ID
  ): Promise<ServiceResponse<string | null, PickError>> {
    try {
      // make sure ID is a string for comparison
      const externalIdString = externalTeamId.toString();
      
      console.log(`Looking up internal team ID for external ID: ${externalIdString}`);
      
      // Look in the teams table for the team with the external ID
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('external_api_id', externalIdString)
        .maybeSingle();
      
      // handle errors
      if (teamError) {
        console.error("Error looking up team:", teamError);
        throw new PickError('Failed to look up team.', 'DATABASE_ERROR', teamError);
      }
      // handle case where team with external ID is not found
      if (!teamData) {
        console.warn(`No team found with external ID: ${externalIdString}`);
        return { data: null, error: null };
      }
      // return the team's internal UUID
      console.log(`Found internal team ID: ${teamData.id} for external ID: ${externalIdString}`);
      return { data: teamData.id, error: null };
      
    } catch (err) {
      // handle our pick errors
      if (err instanceof PickError) {
        return { data: null, error: err };
      }
      console.error("Unexpected error in findTeamUuidByExternalId:", err);
      return {
        data: null,
        error: new PickError('An unexpected error looking up team.', 'DATABASE_ERROR', err)
      };
    }
  },

// saves a user's pick for a specific round (either by inserting or updating)
  async saveUserPick(
    supabase: SupabaseClient<Database>,
    userId: string,
    roundId: string,
    teamId: string,
    isExternalId: boolean = true // default to treating teamId as an external ID
  ): Promise<ServiceResponse<Pick, PickError>> {
    try {
      // quick validation
      if (!userId) throw new PickError('User ID is required.', 'VALIDATION_ERROR');
      if (!roundId) throw new PickError('Round ID is required.', 'VALIDATION_ERROR');
      if (!teamId) throw new PickError('Team ID is required.', 'VALIDATION_ERROR');

      // check if round deadline has passed
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select('deadline_date')
        .eq('id', roundId)
        .single();

      if (roundError) {
        throw new PickError('Failed to fetch round details.', 'DATABASE_ERROR', roundError);
      }
      // logic to check if round deadline has passed
      const deadlineDate = new Date(roundData.deadline_date);
      const now = new Date();
      const isDeadlinePassed = deadlineDate < now;

      // convert external team ID to internal team ID if needed
      let internalTeamId = teamId;
      
      if (isExternalId) {
        const lookupResult = await this.findTeamUuidByExternalId(supabase, teamId);
        
        if (lookupResult.error) {
          return { data: null, error: lookupResult.error };
        }
        
        if (!lookupResult.data) {
          throw new PickError(`Team with external ID ${teamId} not found.`, 'NOT_FOUND');
        }
        
        internalTeamId = lookupResult.data;
      }

      // prepare the pick data for insertion
      const pickData: PickInsert = {
        user_id: userId,
        round_id: roundId,
        team_id: internalTeamId,
        status: isDeadlinePassed ? 'locked' : 'pending', // lock pick if round deadline has passed
        pick_timestamp: new Date().toISOString()
      };

      // upsert the pick (insert or update if exists)
      const { data, error } = await supabase
        .from('picks')
        .upsert(pickData, { onConflict: 'user_id,round_id' })
        .select()
        .single();

      if (error) {
        throw new PickError('Failed to save pick.', 'DATABASE_ERROR', error);
      }

      return { data, error: null };
    } catch (err) {
      // handle our pick errors
      if (err instanceof PickError) {
        return { data: null, error: err };
      }
      console.error("Unexpected error in saveUserPick:", err);
      return {
        data: null,
        error: new PickError('An unexpected error occurred.', 'DATABASE_ERROR', err)
      };
    }
  },

// allow users to save multiple picks across rounds
  async savePicks(
    supabase: SupabaseClient<Database>,
    userId: string,
    competitionId: string,
    roundId: string,
    picks: PickInsert[] //type need to be different to normal Pick type
  ) {
    try {
      // start by deleting existing picks for this user in the rounds selected, for the given competition
      const { error: deleteError } = await supabase
        .from('picks')
        .delete()
        .match({
          user_id: userId,
          competition_id: competitionId,
          round_id: roundId
        });

      if (deleteError) {
        console.error('Error deleting existing picks:', deleteError);
        return { data: null, error: deleteError };
      }

      // Insert the latest picks
      const { data, error } = await supabase
        .from('picks')
        .insert(picks)
        .select();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in pickService.savePicks:', error);
      return { 
        data: null, 
        error: error instanceof Error 
          ? error 
          : new Error('Unknown error in pickService.savePicks') 
      };
    }
  },

// grab a user's picks for a specific round
  async getUserPicksForRound(
    supabase: SupabaseClient<Database>,
    userId: string,
    competitionId: string,
    roundId: string
  ) {
    try {
      // update any picks that should be locked
      await this.updatePicksToLocked(supabase);

      // grab the picks
      const { data, error } = await supabase
        .from('picks')
        .select(`
          id,
          fixture_id,
          fixtures (
            id,
            home_team,
            away_team,
            kickoff_time,
            home_team_score,
            away_team_score,
            status
          )
        `)
        .match({
          user_id: userId,
          competition_id: competitionId,
          round_id: roundId
        });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in pickService.getUserPicksForRound:', error);
      return { 
        data: null, 
        error: error instanceof Error 
          ? error 
          : new Error('Unknown error in pickService.getUserPicksForRound') 
      };
    }
  },

// grab a user's picks for multiple rounds
  async getUserPicksForRounds(
    supabase: SupabaseClient<Database>,
    userId: string,
    competitionId: string,
    roundIds: string[]
  ) {
    try {
      const { data, error } = await supabase
        .from('picks')
        .select(`
          id,
          round_id,
          fixture_id,
          fixtures (
            id,
            home_team,
            away_team,
            kickoff_time,
            home_team_score,
            away_team_score,
            status
          )
        `)
        .match({
          user_id: userId,
          competition_id: competitionId
        })
        .in('round_id', roundIds);

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in pickService.getUserPicksForRounds:', error);
      return { 
        data: null, 
        error: error instanceof Error 
          ? error 
          : new Error('Unknown error in pickService.getUserPicksForRounds') 
      };
    }
  },

 // change the status of picks to locked if the round deadline has passed
  async updatePicksToLocked(
    supabase: SupabaseClient<Database>
  ): Promise<ServiceResponse<Pick[], PickError>> {
    try {
      // Get current time
      const now = new Date().toISOString();

      // Find all picks that are PENDING and whose round deadline has passed
      const { data: picks, error } = await supabase
        .from('picks')
        .select(`
          *,
          rounds (
            deadline_date
          )
        `)
        .eq('status', 'pending')
        .lt('rounds.deadline_date', now);

      if (error) {
        throw new PickError('Failed to fetch pending picks.', 'DATABASE_ERROR', error);
      }

      if (!picks || picks.length === 0) {
        return { data: [], error: null };
      }
    // use a type for the update data
      const updateData: PickUpdate = { status: 'locked' };
      // change the status of the picks to locked
      const { data: updatedPicks, error: updateError } = await supabase
        .from('picks')
        .update(updateData)
        .in('id', picks.map(pick => pick.id))
        .select();

      if (updateError) {
        throw new PickError('Failed to update picks to locked status.', 'DATABASE_ERROR', updateError);
      }

      return { data: updatedPicks || [], error: null };
    } catch (err) {
      if (err instanceof PickError) {
        return { data: null, error: err };
      }
      console.error("Unexpected error in updatePicksToLocked:", err);
      return {
        data: null,
        error: new PickError('An unexpected error occurred.', 'DATABASE_ERROR', err)
      };
    }
  },

// grab all picks for a specific round
  async getRoundPicks(
    supabase: SupabaseClient<Database>,
    competitionId: string,
    roundId: string
  ) {
    try {
      // quick update to lock any picks that should be locked
      await this.updatePicksToLocked(supabase);

      const { data, error } = await supabase
        .from('picks')
        .select(`
          id,
          user_id,
          fixture_id,
          fixtures (
            id,
            home_team,
            away_team,
            kickoff_time,
            home_team_score,
            away_team_score,
            status
          )
        `)
        .match({
          competition_id: competitionId,
          round_id: roundId
        });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in pickService.getRoundPicks:', error);
      return { 
        data: null, 
        error: error instanceof Error 
          ? error 
          : new Error('Unknown error in pickService.getRoundPicks') 
      };
    }
  },
  async convertExternalTeamIds(
    supabase: SupabaseClient<Database>,
    externalTeamIds: (string | number)[]
  ): Promise<(string | null)[]> {
    const results = await Promise.all(
      externalTeamIds.map(id => this.findTeamUuidByExternalId(supabase, id))
    );
    return results.map(result => result.data);
  },
  
  // Create pick objects for a round from a list of team IDs
  createPicksForRound(
    userId: string,
    roundId: string,
    internalTeamIds: string[] // Expects an array of valid, non-null internal UUIDs
  ): PickInsert[] {
    return internalTeamIds.map((internalTeamId) => {
      // No null check needed here due as the type signature is (string[])
      // The calling code (API endpoint) is responsible for ensuring only valid IDs are passed.
      return {
        user_id: userId,
        round_id: roundId,
        team_id: internalTeamId,
        pick_timestamp: new Date().toISOString(),
        status: 'pending'
      };
    });
  }
}; 