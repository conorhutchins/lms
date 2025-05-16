import { Database } from './supabase';

export type Round = Database['public']['Tables']['rounds']['Row'];
type Competition = Database['public']['Tables']['competitions']['Row'];
type Fixture = Database['public']['Tables']['fixtures']['Row'];

export enum RoundStatus {
  UPCOMING = 'upcoming',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

// Expanded type for round with related data
export type RoundWithCompetitionAndFixtures = Round & {
  competitions: Competition | null;
  fixtures: Fixture[];
  status?: RoundStatus;
};

export type RoundErrorCode = 
  | 'NOT_FOUND' 
  | 'DATABASE_ERROR' 
  | 'VALIDATION_ERROR';

export interface RoundServiceConfig {
  cacheEnabled?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export function isRoundActive(round: Partial<Round>): boolean {
  const now = new Date();
  const deadlineDate = round.deadline_date ? new Date(round.deadline_date) : null;

  return deadlineDate !== null && now <= deadlineDate;
}

// Helper to parse ISO dates with custom format (ending with 's')
function parseISODate(isoDateString: string | null | undefined): Date | null {
  if (!isoDateString) return null;
  
  // For dates with the 's' suffix format that the user prefers
  if (isoDateString.endsWith('s')) {
    // Simply replace 's' with 'Z' for ISO 8601 compatibility
    const standardIso = isoDateString.replace(/s$/, 'Z');
    return new Date(standardIso);
  }
  
  // Standard Date constructor for other formats
  return new Date(isoDateString);
}

export function getRoundStatus(round: Partial<Round>): RoundStatus {
  const now = new Date();
  const deadlineDate = parseISODate(round.deadline_date);
  
  if (!deadlineDate) return RoundStatus.UPCOMING;

  if (now <= deadlineDate) return RoundStatus.IN_PROGRESS;
  return RoundStatus.COMPLETED;
}

export function validateRoundInput(roundData: Partial<Round>): void {
  if (!roundData.competition_id) {
    throw new Error('Competition ID is required');
  }

  if (roundData.deadline_date) {
    const deadline = new Date(roundData.deadline_date);
    
    if (deadline < new Date()) {
      throw new Error('Deadline date must be in the future');
    }
  }
}

/**
 * Ensures that a round's fixtures property is always an array
 */
export function ensureFixturesArray(round: any): Fixture[] {
  if (!round) return [];
  return Array.isArray(round.fixtures) ? round.fixtures : [];
}

/**
 * Creates a safe, normalized round object conforming to the RoundWithCompetitionAndFixtures type
 */
export function createSafeRoundObject(round: any): RoundWithCompetitionAndFixtures {
  if (!round) {
    throw new Error('Cannot normalise undefined round');
  }
  
  return {
    ...round,
    fixtures: ensureFixturesArray(round),
    status: round.status || getRoundStatus(round)
  };
}

/**
 * Creates a type-safe round list result
 */
export interface RoundListResult {
  rounds: RoundWithCompetitionAndFixtures[];
  total: number;
  page: number;
  pageSize: number;
}
