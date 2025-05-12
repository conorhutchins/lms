import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceResponse } from '../../../types/service';
import { logEvent } from '../../../utils/logging';
import { Database } from '../../../types/supabase';
import {
  Pick,
  PickInsert,
  PickStatus,
  PickError,
  PickUpdate,
  convertExternalTeamIds,
  createPicksForRound
} from '../../../types/pick';

// In-memory cache for team lookups to reduce database queries
const teamCache = new Map<string, string>();

// Service object with methods inside
// 1. pickService.findUserPickForRound - grab users pick for a specific round
// 2. pickService.findTeamUuidByExternalId - grab a team's internal UUID in database using its external API ID
// 3. pickService.saveUserPick - save or update a user's pick for a single round
// 4. pickService.savePicks - save or update multiple picks across rounds for a user
// 5. pickService.getUserPicksForRound - grab a users pick for a single round
// 6. pickService.getUserPicksForRounds - grab a user's picks for multiple rounds
// 7. pickService.updatePicksToLocked - change the status of picks to locked if the round deadline has passed
// 8. pickService.getRoundPicks - grab all picks for a specific round

// Export PickError and PickStatus for use in tests
export { PickError, PickStatus };

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
    externalTeamId: string | number, // external API team ID
    options: { 
      useCache?: boolean; 
      logLevel?: 'debug' | 'info' | 'warn' | 'error' 
    } = { useCache: true, logLevel: 'warn' }
  ): Promise<ServiceResponse<string | null, PickError>> {
    const { 
      useCache = true, 
      logLevel = 'warn' 
    } = options;

    try {
      // Ensure the external team ID is a string for consistent comparison
      const externalIdString = externalTeamId.toString();
      
      // Check in-memory cache first if caching is enabled
      if (useCache) {
        const cachedTeamId = teamCache.get(externalIdString);
        if (cachedTeamId) {
          this.logMessage(logLevel, `Cache hit for external team ID: ${externalIdString}`);
          return { data: cachedTeamId, error: null };
        }
      }
      
      this.logMessage(logLevel, `Looking up internal team ID for external ID: ${externalIdString}`);
      
      // Query the teams table to find the team with the matching external ID
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('external_api_id', externalIdString)
        .maybeSingle();
      
      // Handle database query errors
      if (teamError) {
        this.logMessage('error', `Database error looking up team: ${teamError.message}`);
        throw new PickError('Failed to look up team.', 'DATABASE_ERROR', teamError);
      }

      // Handle case where no team is found with the given external ID
      if (!teamData) {
        this.logMessage(logLevel, `No team found with external ID: ${externalIdString}`);
        return { data: null, error: null };
      }

      // Cache the result if caching is enabled
      if (useCache) {
        teamCache.set(externalIdString, teamData.id);
      }
      
      this.logMessage(logLevel, `Found internal team ID: ${teamData.id} for external ID: ${externalIdString}`);
      return { data: teamData.id, error: null };
      
    } catch (err) {
      // Handle specific Pick errors
      if (err instanceof PickError) {
        return { data: null, error: err };
      }

      // Log and wrap unexpected errors
      this.logMessage('error', `Unexpected error in findTeamUuidByExternalId: ${err}`);
      return {
        data: null,
        error: new PickError('An unexpected error occurred whilst looking up the team.', 'DATABASE_ERROR', err)
      };
    }
  },

  // Centralised logging method with UK English spelling
  logMessage(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const logLevels = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error
    };
    logLevels[level](message);
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
        status: isDeadlinePassed ? PickStatus.LOCKED : PickStatus.PENDING, // lock pick if round deadline has passed
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
    // Optimise team ID conversion by using a single database query
    const externalIdStrings = externalTeamIds.map(id => id.toString());
    
    try {
      // Fetch all matching internal team IDs in a single query
      const { data: teamMappings, error } = await supabase
        .from('teams')
        .select('id, external_api_id')
        .in('external_api_id', externalIdStrings);
      
      if (error) {
        this.logMessage('error', `Error converting external team IDs: ${error.message}`);
        throw new PickError('Failed to convert external team IDs.', 'DATABASE_ERROR', error);
      }

      // Create a mapping of external to internal IDs for efficient lookup
      const teamIdMap = new Map(
        teamMappings.map(team => [team.external_api_id, team.id])
      );
      
      // Map external IDs to internal IDs, preserving original order
      return externalIdStrings.map(externalId => 
        teamIdMap.get(externalId) || null
      );
      
    } catch (err) {
      this.logMessage('error', `Unexpected error in convertExternalTeamIds: ${err}`);
      throw err;
    }
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