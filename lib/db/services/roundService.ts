import { Database } from '../../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, type ServiceResponse } from '../../types/service';

// Define helper types from database schema
type Round = Database['public']['Tables']['rounds']['Row'];
type Competition = Database['public']['Tables']['competitions']['Row'];
type Fixture = Database['public']['Tables']['fixtures']['Row'];

// create a larger type for linked data that has a round, a competition and fixtures
export type RoundWithCompetitionAndFixtures = Round & {
  competitions: Competition | null; // Use the singular form as it links to one competition
  fixtures: Fixture[];
};

// Custom error class
export class RoundError extends ServiceError {
  constructor(
    message: string,
    code: 'NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'RoundError';
  }
}

// Service object with following methods
// 1. roundService.findRoundWithFixtures - find a round by its ID, including its parent competition and associated fixtures.

export const roundServices = {
// find a round by its ID with related competition and fixtures
  async findRoundWithFixtures(
    supabase: SupabaseClient<Database>,
    roundId: string
  ): Promise<ServiceResponse<RoundWithCompetitionAndFixtures, RoundError>> {
    try {
      // quick validation
      if (!roundId) {
        throw new RoundError('Round ID is required.', 'VALIDATION_ERROR');
      }

      // query rounds table with joined competition data
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select(`
          *,
          competitions (*)
        `)
        .eq('id', roundId)
        .single();

      if (roundError) {
        if (roundError.code === 'PGRST116') { // Not found
          throw new RoundError(`Round with ID ${roundId} not found.`, 'NOT_FOUND', roundError);
        }
        throw new RoundError('Failed to fetch round details.', 'DATABASE_ERROR', roundError);
      }
      // verify round data exists
      if (!roundData) {
         throw new RoundError(`Round with ID ${roundId} not found.`, 'NOT_FOUND');
      }
      // verify competition data exists
      if (!roundData.competitions) {
          // This would indicate a data integrity issue if a round exists without a competition
          throw new RoundError(`Competition details not found for round ${roundId}.`, 'DATABASE_ERROR');
      }

// extract the info needed to find the fixtures
      const competition = roundData.competitions;
      const roundNumber = roundData.round_number;
      let leagueId: number | null = null; // Placeholder
      let season: number | null = null; // Placeholder
      
      // map compeition to league and season
      if (competition.sport?.toLowerCase() === 'football' && competition.title?.includes('Premier League')) {
        leagueId = 39; // PL is 39 from Football API
        try {
            // extract the season year from the competition start date
            season = new Date(competition.start_date).getFullYear();
        } catch { 
          console.warn(`Could not determine season for competition ${competition.id} (${competition.title}) to fetch fixtures.`);
         }
      } // Come back and add mappings for other leagues/sports here
      
      // if we can't determine the league or season, return an error
      if (leagueId === null || season === null) {
          console.warn(`Could not determine leagueId/season for competition ${competition.id} (${competition.title}) to fetch fixtures.`);
          return {
              data: { ...roundData, fixtures: [] }, // Return empty fixtures array
              error: null
          };
      }

      console.log(`Fetching fixtures for League ${leagueId}, Season ${season}, Gameweek ${roundNumber}`);
      
      // find the gameweek that corresponds to this round number
      const { data: gameweekData, error: gameweekError } = await supabase
        .from('gameweeks')
        .select('id')
        .eq('league_id', leagueId)
        .eq('season', season)
        .eq('gameweek_number', roundNumber)
        .single();
      // handle gameweek specific errors
      if (gameweekError) {
        console.error(`Error finding gameweek for League ${leagueId}, Season ${season}, Gameweek ${roundNumber}:`, gameweekError);
        return {
          data: { ...roundData, fixtures: [] }, // Return empty fixtures array
          error: null
        };
      }
      
      if (!gameweekData) {
        console.warn(`No gameweek found for League ${leagueId}, Season ${season}, Gameweek ${roundNumber}`);
        return {
          data: { ...roundData, fixtures: [] }, // Return empty fixtures array
          error: null
        };
      }
      // extract the gameweek ID
      const gameweekId = gameweekData.id;
      console.log(`Found gameweek ID ${gameweekId} for League ${leagueId}, Season ${season}, Gameweek ${roundNumber}`);
      
      // query fixtures table with joined gameweek data
      const { data: fixturesData, error: fixtureError } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_id', leagueId)
        .eq('season', season)
        .eq('gameweek_id', gameweekId) 
        .order('kickoff_time'); // Sort fixtures by kickoff time
      // handle fixture specific errors
      if (fixtureError) {
        console.error('Error fetching fixtures for round:', fixtureError);
         return {
              data: { ...roundData, fixtures: [] }, // Return empty fixtures array
              error: null // Could also return a non-blocking error. Just show success with empty fixtures.
          };
      }

      //  Combine round, compeition and fixtures data ready to return
      const result: RoundWithCompetitionAndFixtures = {
        ...roundData,
        fixtures: fixturesData || [],
      };
// return combined data
      return { data: result, error: null };

    } catch (err) {
      if (err instanceof RoundError) {
        return { data: null, error: err };
      }
      console.error("Unexpected error in findRoundWithFixtures:", err);
      return {
        data: null,
        error: new RoundError('An unexpected error occurred.', 'DATABASE_ERROR', err)
      };
    }
  }
}; 