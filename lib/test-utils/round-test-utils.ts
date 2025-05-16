import { Round, RoundStatus, RoundWithCompetitionAndFixtures } from '../types/round';
import { Database } from '../types/supabase';

// Types from Supabase schema
type Competition = Database['public']['Tables']['competitions']['Row'];
type Fixture = Database['public']['Tables']['fixtures']['Row'];

/**
 * Creates a mock round for testing
 */
export const createMockRoundData = (): Round => ({
  id: 'round-123',
  competition_id: 'comp-123',
  deadline_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
  created_at: new Date().toISOString(),
  gameweek_id: 'gw-1',
  round_number: 1,
});

/**
 * Creates a mock competition for testing
 */
export const createMockCompetitionData = (): Competition => ({
  id: 'comp-123',
  title: 'Test Competition',
  description: null,
  sport: 'football',
  entry_fee: 10,
  prize_pot: 1000,
  rolled_over: false,
  start_date: new Date().toISOString(),
  status: 'active',
  created_at: new Date().toISOString(),
});

/**
 * Creates mock fixtures for testing
 */
export const createMockFixturesData = (): Fixture[] => [
  {
    id: 'fixture-1',
    external_id: 12345,
    home_team: 'Team A',
    away_team: 'Team B',
    home_team_id: 1,
    away_team_id: 2,
    home_score: null,
    away_score: null,
    kickoff_time: new Date().toISOString(),
    gameweek_id: 'gw-1',
    status: 'scheduled',
    created_at: new Date().toISOString(),
    league_id: 1,
    results_processed: false,
    round: 'round-123',
    season: 2024,
  },
  {
    id: 'fixture-2',
    external_id: 12346,
    home_team: 'Team C',
    away_team: 'Team D',
    home_team_id: 3,
    away_team_id: 4,
    home_score: null,
    away_score: null,
    kickoff_time: new Date().toISOString(),
    gameweek_id: 'gw-1',
    status: 'scheduled',
    created_at: new Date().toISOString(),
    league_id: 1,
    results_processed: false,
    round: 'round-123',
    season: 2024,
  },
];

/**
 * Creates a complete round with relations for testing
 */
export const createMockRoundWithRelationsData = (): RoundWithCompetitionAndFixtures => ({
  ...createMockRoundData(),
  competitions: createMockCompetitionData(),
  fixtures: createMockFixturesData(),
  status: RoundStatus.IN_PROGRESS,
});

/**
 * Creates test fixtures with specified status and custom properties
 */
export const createTestRound = (
  status: RoundStatus, 
  customProps: Partial<Round> = {}
): RoundWithCompetitionAndFixtures => {
  // Base deadline date logic based on status
  let deadlineDate: string;
  const now = Date.now();
  
  switch (status) {
    case RoundStatus.UPCOMING:
      deadlineDate = new Date(now + 86400000 * 7).toISOString(); // 7 days in future
      break;
    case RoundStatus.IN_PROGRESS:
      deadlineDate = new Date(now + 86400000).toISOString(); // 1 day in future
      break;
    case RoundStatus.COMPLETED:
      deadlineDate = new Date(now - 86400000).toISOString(); // 1 day in past
      break;
  }
  
  return {
    ...createMockRoundData(),
    deadline_date: deadlineDate,
    ...customProps,
    competitions: createMockCompetitionData(),
    fixtures: createMockFixturesData(),
    status
  };
};

/**
 * Creates a database error with the specified message
 */
export const createDatabaseError = (message: string = 'Database error') => {
  return { message, code: 'DATABASE_ERROR' };
};
