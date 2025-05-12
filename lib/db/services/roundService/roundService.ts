import type { SupabaseClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';
import { ServiceResponse } from '../../../types/service';
import { logEvent } from '../../../utils/logging';
import { Database } from '../../../types/supabase';
import { 
  Round, 
  RoundStatus, 
  RoundWithCompetitionAndFixtures,
  RoundListResult,
  isRoundActive,
  getRoundStatus,
  validateRoundInput,
  ensureFixturesArray,
  normalizeRound
} from '../../../types/round';

// Caching configuration
const ROUND_CACHE = new NodeCache({ 
  stdTTL: 300, // 5 minutes cache
  checkperiod: 320 // Slightly longer than TTL to check for expired keys
});

// Types from Supabase schema
type Competition = Database['public']['Tables']['competitions']['Row'];
type Fixture = Database['public']['Tables']['fixtures']['Row'];

// Custom error class with enhanced logging
export class RoundError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'RoundError';
    
    // Log all errors for monitoring
    logEvent('error', `RoundError: ${code}`, { 
      message, 
      originalError: originalError instanceof Error ? originalError.message : originalError 
    });
  }

  // Static factory methods for creating specific errors
  static notFound(message: string = 'Round not found', context?: Record<string, unknown>): RoundError {
    return new RoundError(message, 'NOT_FOUND', context);
  }

  static databaseError(
    message: string = 'Database error in round service', 
    originalError?: unknown
  ): RoundError {
    return new RoundError(message, 'DATABASE_ERROR', originalError);
  }

  static validationError(
    message: string = 'Invalid round data',
    details?: Record<string, unknown>
  ): RoundError {
    return new RoundError(message, 'VALIDATION_ERROR', details);
  }
}

// Re-export the type for use in other modules
export type { RoundWithCompetitionAndFixtures } from '../../../types/round';

// Round service methods
export async function findRoundWithFixtures(
  supabase: SupabaseClient,
  roundId: string
): Promise<ServiceResponse<RoundWithCompetitionAndFixtures>> {
  try {
    // Validate input
    validateRoundInput({ id: roundId });

    // Fetch round with competition and fixtures
    const { data, error } = await supabase
      .from('rounds')
      .select(`
        *,
        competitions (*),
        fixtures (*)
      `)
      .eq('id', roundId)
      .single();

    if (error) {
      logEvent('error', 'Error fetching round', { error, roundId });
      return { data: null, error: RoundError.databaseError(error.message) };
    }

    if (!data) {
      return { data: null, error: RoundError.notFound() };
    }

    // Enhance with status
    const roundWithStatus: RoundWithCompetitionAndFixtures = {
      ...data,
      status: getRoundStatus(data)
    };

    return { data: roundWithStatus, error: null };
  } catch (err) {
    logEvent('error', 'Unexpected error in findRoundWithFixtures', { error: err });
    return { 
      data: null, 
      error: RoundError.databaseError('Unexpected error', err) 
    };
  }
}

// Service object with following methods
export const roundServices = {
  // Cached round retrieval with advanced error handling
  async findRoundWithFixtures(
    supabase: SupabaseClient<Database>,
    roundId: string,
    options: { 
      forceRefresh?: boolean, 
      includeRelations?: boolean 
    } = {}
  ): Promise<ServiceResponse<RoundWithCompetitionAndFixtures, RoundError>> {
    const { forceRefresh = false, includeRelations = true } = options;

    try {
      // Validate input
      if (!roundId) {
        return { 
          data: null, 
          error: RoundError.validationError('Round ID is required', { roundId }) 
        };
      }

      // Check cache first
      if (!forceRefresh) {
        const cachedRound = ROUND_CACHE.get<RoundWithCompetitionAndFixtures>(roundId);
        if (cachedRound) {
          return { data: cachedRound, error: null };
        }
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
          return { 
            data: null, 
            error: RoundError.notFound(`Round with ID ${roundId} not found.`, { roundId }) 
          };
        }
        return { 
          data: null, 
          error: RoundError.databaseError('Failed to fetch round details.', roundError) 
        };
      }
      
      // verify round data exists
      if (!roundData) {
        return { 
          data: null, 
          error: RoundError.notFound(`Round with ID ${roundId} not found.`, { roundId }) 
        };
      }
      
      // verify competition data exists
      if (!roundData.competitions) {
        // This would indicate a data integrity issue if a round exists without a competition
        return { 
          data: null, 
          error: RoundError.databaseError(`Competition details not found for round ${roundId}.`, { roundId }) 
        };
      }

      // extract the info needed to find the fixtures
      const competition = roundData.competitions;
      const roundNumber = roundData.round_number;
      let leagueId: number | null = null; // Placeholder
      let season: number | null = null; // Placeholder
      
      // map competition to league and season
      if (competition.sport?.toLowerCase() === 'football' && competition.title?.includes('Premier League')) {
        leagueId = 39; // PL is 39 from Football API
        try {
          // extract the season year from the competition start date
          season = new Date(competition.start_date).getFullYear();
        } catch { 
          logEvent('warn', `Could not determine season for competition ${competition.id} to fetch fixtures.`, {
            competitionId: competition.id,
            competitionTitle: competition.title
          });
        }
      } // Come back and add mappings for other leagues/sports here
      
      // if we cannot determine the league or season, return with empty fixtures
      if (leagueId === null || season === null) {
        logEvent('warn', `Could not determine leagueId/season for competition to fetch fixtures.`, {
          competitionId: competition.id,
          competitionTitle: competition.title
        });
        
        const result: RoundWithCompetitionAndFixtures = {
          ...roundData,
          fixtures: [],
          status: getRoundStatus(roundData)
        };
        
        // Cache the result even with empty fixtures
        ROUND_CACHE.set(roundId, result);
        
        return {
          data: result,
          error: null
        };
      }

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
        logEvent('error', `Error finding gameweek for round`, {
          leagueId,
          season,
          roundNumber,
          error: gameweekError
        });
        
        const result: RoundWithCompetitionAndFixtures = {
          ...roundData,
          fixtures: [],
          status: getRoundStatus(roundData)
        };
        
        // Cache the result even with empty fixtures
        ROUND_CACHE.set(roundId, result);
        
        return {
          data: result,
          error: null
        };
      }
      
      if (!gameweekData) {
        logEvent('warn', `No gameweek found for round`, {
          leagueId,
          season,
          roundNumber
        });
        
        const result: RoundWithCompetitionAndFixtures = {
          ...roundData,
          fixtures: [],
          status: getRoundStatus(roundData)
        };
        
        // Cache the result even with empty fixtures
        ROUND_CACHE.set(roundId, result);
        
        return {
          data: result,
          error: null
        };
      }
      
      // extract the gameweek ID
      const gameweekId = gameweekData.id;
      
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
        logEvent('error', 'Error fetching fixtures for round', {
          leagueId,
          season,
          gameweekId,
          error: fixtureError
        });
        
        const result: RoundWithCompetitionAndFixtures = {
          ...roundData,
          fixtures: [],
          status: getRoundStatus(roundData)
        };
        
        // Cache the result even with empty fixtures
        ROUND_CACHE.set(roundId, result);
        
        return {
          data: result,
          error: null
        };
      }

      // Combine round, competition and fixtures data ready to return
      const result: RoundWithCompetitionAndFixtures = {
        ...roundData,
        fixtures: fixturesData || [],
        status: getRoundStatus(roundData)
      };
      
      // Cache the result
      ROUND_CACHE.set(roundId, result);
      
      return { data: result, error: null };
    } catch (err) {
      return { 
        data: null, 
        error: RoundError.databaseError('Unexpected round retrieval error', err) 
      };
    }
  },
  
  // List rounds with advanced filtering and pagination
  async listRounds(
    supabase: SupabaseClient<Database>,
    filters: {
      competitionId?: string;
      status?: RoundStatus;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<ServiceResponse<RoundListResult, RoundError>> {
    try {
      const { 
        competitionId, 
        status, 
        page = 1, 
        pageSize = 10 
      } = filters;

      // Create a cache key based on the filters
      const cacheKey = `rounds_list_${competitionId || 'all'}_${status || 'all'}_${page}_${pageSize}`;
      const cachedResult = ROUND_CACHE.get<RoundListResult>(cacheKey);
      if (cachedResult) {
        return { data: cachedResult, error: null };
      }

      // Build query filters
      const queryFilters = [];
      if (competitionId) {
        queryFilters.push({ competition_id: competitionId });
      }

      const query = supabase
        .from('rounds')
        .select('*, competitions (*), fixtures (*)', { count: 'exact' });
      
      // Apply filters if any
      if (queryFilters.length > 0) {
        queryFilters.forEach(filter => {
          Object.entries(filter).forEach(([key, value]) => {
            query.eq(key, value);
          });
        });
      }
      
      // Apply pagination and ordering
      query
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('round_number', { ascending: true });

      const { data, count, error } = await query;

      if (error) {
        return { 
          data: null, 
          error: RoundError.databaseError(error.message, error) 
        };
      }

      // Normalise rounds to ensure they conform to the expected type
      const normalisedRounds = data.map(round => normalizeRound(round));

      const result: RoundListResult = {
        rounds: normalisedRounds,
        total: count ?? 0,
        page,
        pageSize
      };
      
      // Cache the result
      ROUND_CACHE.set(cacheKey, result, 300); // Cache for 5 minutes

      return { data: result, error: null };
    } catch (err) {
      return { 
        data: null, 
        error: RoundError.databaseError('Error listing rounds', err) 
      };
    }
  },

  // Get the current active round for a competition
  async getCurrentActiveRound(
    supabase: SupabaseClient<Database>,
    competitionId: string
  ): Promise<ServiceResponse<RoundWithCompetitionAndFixtures, RoundError>> {
    try {
      // Validate input
      if (!competitionId) {
        return { 
          data: null, 
          error: RoundError.validationError('Competition ID is required', { competitionId }) 
        };
      }

      // Check cache first
      const cacheKey = `active_round_${competitionId}`;
      const cachedActiveRound = ROUND_CACHE.get<RoundWithCompetitionAndFixtures>(cacheKey);
      if (cachedActiveRound) return { data: cachedActiveRound, error: null };

      // First try to find a round with IN_PROGRESS status
      const { data: activeRounds, error: activeError } = await supabase
        .from('rounds')
        .select('*, competitions (*), fixtures (*)')
        .eq('competition_id', competitionId)
        .order('deadline_date', { ascending: true });

      if (activeError) {
        return { 
          data: null, 
          error: RoundError.databaseError('Failed to fetch active rounds', activeError) 
        };
      }

      if (!activeRounds || activeRounds.length === 0) {
        return { 
          data: null, 
          error: RoundError.notFound('No rounds found for competition', { competitionId }) 
        };
      }

      // Find the first active round or the next upcoming round
      const now = new Date();
      
      // First try to find a round that's currently active
      const activeRound = activeRounds.find(round => {
        const status = getRoundStatus(round);
        return status === RoundStatus.IN_PROGRESS;
      });
      
      if (activeRound) {
        // Normalise the round with IN_PROGRESS status
        const normalisedRound = normalizeRound({
          ...activeRound,
          status: RoundStatus.IN_PROGRESS
        });
        
        // Cache the result
        ROUND_CACHE.set(cacheKey, normalisedRound);
        
        return { data: normalisedRound, error: null };
      }
      
      // If no active round, find the next upcoming round
      const upcomingRounds = activeRounds.filter(round => {
        const deadlineDate = new Date(round.deadline_date);
        return deadlineDate > now;
      });
      
      if (upcomingRounds.length > 0) {
        // Sort by deadline date ascending and get the first one
        upcomingRounds.sort((a, b) => 
          new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime()
        );
        
        const nextRound = upcomingRounds[0];
        // Normalise the round with UPCOMING status
        const normalisedRound = normalizeRound({
          ...nextRound,
          status: RoundStatus.UPCOMING
        });
        
        // Cache the result
        ROUND_CACHE.set(cacheKey, normalisedRound);
        
        return { data: normalisedRound, error: null };
      }
      
      // If no upcoming rounds, return the most recent completed round
      const completedRounds = activeRounds.filter(round => {
        const deadlineDate = new Date(round.deadline_date);
        return deadlineDate <= now;
      });
      
      if (completedRounds.length > 0) {
        // Sort by deadline date descending and get the first one
        completedRounds.sort((a, b) => 
          new Date(b.deadline_date).getTime() - new Date(a.deadline_date).getTime()
        );
        
        const lastRound = completedRounds[0];
        // Normalise the round with COMPLETED status
        const normalisedRound = normalizeRound({
          ...lastRound,
          status: RoundStatus.COMPLETED
        });
        
        // Cache the result
        ROUND_CACHE.set(cacheKey, normalisedRound);
        
        return { data: normalisedRound, error: null };
      }

      return { 
        data: null, 
        error: RoundError.notFound('No suitable round found for competition', { competitionId }) 
      };
    } catch (err) {
      return { 
        data: null, 
        error: RoundError.databaseError('Error finding active round', err) 
      };
    }
  },

  // Clear cache for a specific round or all rounds
  clearCache(roundId?: string) {
    if (roundId) {
      ROUND_CACHE.del(roundId);
      // Also clear any list caches that might contain this round
      const keysToDelete = ROUND_CACHE.keys().filter(key => 
        key.startsWith('rounds_list_') || key.startsWith('active_round_')
      );
      keysToDelete.forEach(key => ROUND_CACHE.del(key));
    } else {
      ROUND_CACHE.flushAll();
    }
    
    logEvent('info', 'Round service cache cleared', { roundId });
  }
};
