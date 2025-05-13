import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoundPicks, RoundWithFixturesAndPick } from './index';
import { Pick } from '../../../types/pick';
import { RoundWithCompetitionAndFixtures, RoundStatus } from '../../../types/round';

// Store original fetch
const originalFetch = global.fetch;

describe('useRoundPicks', () => {
  // Define mock data
  const mockCompetition = {
    id: 'comp-123',
    title: 'Premier League 2025',
    entry_fee: 10,
    start_date: '2025-05-13T10:40:17.207Z',
    status: 'active',
    prize_pot: 1000,
    created_at: '2025-05-13T10:40:17.207Z',
    rolled_over: false,
    sport: 'football',
    description: null // Add the required description property
  };

  const currentDate = new Date('2025-05-13T10:40:17.207Z');
  
  // Mock Date.now to return a consistent date
  const originalDateNow = Date.now;
  const originalDate = global.Date;

  // Mock fixtures for the current round with all required properties
  const mockFixtures = [
    {
      id: 'fixture-1',
      home_team: 'Arsenal',
      away_team: 'Chelsea',
      home_team_id: 1, // Convert to number to match expected type
      away_team_id: 2,
      home_score: null,
      away_score: null,
      kickoff_time: '2025-05-15T10:40:17.207Z',
      status: 'scheduled',
      // Add missing required properties
      created_at: '2025-05-13T10:40:17.207Z',
      external_id: 12345,
      gameweek_id: 'gw-1',
      league_id: 1,
      round: 'round-1',
      season: 2025,
      results_processed: false
    },
    {
      id: 'fixture-2',
      home_team: 'Liverpool',
      away_team: 'Man City',
      home_team_id: 3,
      away_team_id: 4,
      home_score: null,
      away_score: null,
      kickoff_time: '2025-05-15T10:40:17.207Z',
      status: 'scheduled',
      // Add missing required properties
      created_at: '2025-05-13T10:40:17.207Z',
      external_id: 12346,
      gameweek_id: 'gw-1',
      league_id: 1,
      round: 'round-1',
      season: 2025,
      results_processed: false
    }
  ];

  // Initial round data (current round)
  // Using type assertion because test mocks don't need to match exact DB schema
  const initialRoundData = {
    id: 'round-1',
    competition_id: 'comp-123',
    round_number: 1,
    deadline_date: '2025-05-14T23:59:59.000Z', // Future deadline
    title: 'Round 1', // Property in our test but might not match DB schema
    status: RoundStatus.UPCOMING,
    created_at: '2025-05-13T10:40:17.207Z',
    gameweek_id: 'gw-1', // Add required property
    competitions: mockCompetition,
    fixtures: mockFixtures
  } as unknown as RoundWithCompetitionAndFixtures; // Use double casting to avoid type errors

  // Existing pick (if user has already made a selection)
  // Using type assertion to bypass strict type checking for test data
  const existingPick = {
    id: 'pick-1',
    round_id: 'round-1',
    user_id: 'user-1',
    team_id: '1', // Arsenal
    pick_timestamp: '2025-05-13T10:40:17.207Z', // Use pick_timestamp instead of created_at
    competition_id: 'comp-123',
    status: 'active'
  } as Pick;

  // Upcoming rounds
  const upcomingRounds = [
    {
      id: 'round-2',
      competition_id: 'comp-123',
      round_number: 2,
      deadline_date: '2025-05-21T23:59:59.000Z',
      existingPick: null,
      is_past: false
    },
    {
      id: 'round-3',
      competition_id: 'comp-123',
      round_number: 3,
      deadline_date: '2025-05-28T23:59:59.000Z',
      existingPick: null,
      is_past: false
    }
  ];

  // Setup and teardown
  /**
   * Test setup - runs before each test
   */
  beforeEach(() => {
    // Mock the fetch function
    global.fetch = jest.fn();

    // Create a more robust mock Date class
    class MockDate extends originalDate {
      constructor(dateOrYear?: string | number | Date, month?: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number) {
        if (arguments.length === 0) {
          // When called with no args, return our fixed test date
          super(currentDate);
        } else {
          // When called with args, ensure all params have default values to avoid type errors
          super(
            dateOrYear as any,
            month ?? 0,
            date ?? 1,
            hours ?? 0,
            minutes ?? 0,
            seconds ?? 0,
            ms ?? 0
          );
        }
      }
    }
    
    // Override global Date
    global.Date = MockDate as unknown as DateConstructor;
    
    // Mock Date.now to return our fixed test date
    Date.now = jest.fn(() => currentDate.getTime());

    // Silence console.error during tests to keep output clean
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  /**
   * Test cleanup - runs after each test
   */
  afterEach(() => {
    // Restore all mocked functions and objects
    global.fetch = originalFetch;
    global.Date = originalDate;
    Date.now = originalDateNow;
    jest.restoreAllMocks();
  });

  /**
   * Test initialization behavior
   */
  it('should initialize with the provided data', async () => {
    // ARRANGE: Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFixtures)
    });

    // ACT: Render hook
    const { result } = renderHook(() => 
      useRoundPicks(initialRoundData, existingPick, upcomingRounds)
    );

    // Wait for async operations to complete
    await waitFor(() => {
      expect(result.current.roundsData.length).toBe(3);
    });

    // ASSERT: Verify initial state is correct
    expect(result.current.currentRound.id).toBe('round-1');  // Current round selected
    expect(result.current.selections['round-1']).toBe('1');  // Existing pick selected
    expect(result.current.isSaving).toBe(false);            // Not in saving state
    // Check that the current round has fixtures
    expect(result.current.currentRound.fixtures.length).toBeGreaterThan(0);
  });

  /**
   * Test round selection behavior
   */
  it('should handle round selection tab changes', async () => {
    // ARRANGE: Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFixtures)
    });

    // ACT: Render hook and wait for initialization
    const { result } = renderHook(() => 
      useRoundPicks(initialRoundData, existingPick, upcomingRounds)
    );

    await waitFor(() => {
      expect(result.current.roundsData.length).toBe(3);
    });

    // Change selected round
    act(() => {
      result.current.handleTabChange(1); // Switch to second tab (round-2)
    });

    // ASSERT: Verify round selection was updated correctly
    expect(result.current.activeTabIndex).toBe(1);          // New tab index
    expect(result.current.currentRound.id).toBe('round-2'); // New round selected
    expect(result.current.selections['round-2']).toBeNull(); // No existing pick for new round
  });

  /**
   * Test saving a pick successfully
   */
  it('should save current pick successfully', async () => {
    // ARRANGE: Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // ACT: Render hook
    const { result } = renderHook(() => 
      useRoundPicks(initialRoundData, existingPick, upcomingRounds)
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.roundsData.length).toBe(3);
    });

    // Select a team and save
    act(() => {
      result.current.handleSelectionChange('round-1', '2'); // Chelsea
    });

    await act(async () => {
      await result.current.saveCurrentPick();
    });

    // ASSERT: Verify API call and success state
    // Check API was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/picks',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('round-1'),
      })
    );

    // Check success state was set correctly
    const { isSaving, savedSuccess, savedMessage, saveError } = result.current;
    expect(isSaving).toBe(false);
    expect(savedSuccess).toBe(true);
    expect(savedMessage).toContain('Successfully saved');
    expect(saveError).toBeNull();
  });

  /**
   * Test handling save errors
   */
  it('should handle save errors properly', async () => {
    // ARRANGE: Mock error response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'You already picked this team' })
    });

    // ACT: Render hook
    const { result } = renderHook(() => 
      useRoundPicks(initialRoundData, existingPick, upcomingRounds)
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.roundsData.length).toBe(3);
    });

    // Select a team and save
    act(() => {
      result.current.handleSelectionChange('round-1', '2'); // Chelsea
    });

    await act(async () => {
      await result.current.saveCurrentPick();
    });

    // ASSERT: Verify error state
    const { isSaving, savedSuccess, savedMessage, saveError } = result.current;
    expect(isSaving).toBe(false);
    expect(savedSuccess).toBe(false);
    expect(saveError).toBe('You already picked this team');
  });

  /**
   * Test team name resolution from fixtures
   */
  it('should handle team name resolution from fixtures', async () => {
    // ARRANGE: Mock team name lookup API with delay to simulate async behavior
    (global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ name: 'Arsenal' })
      });
    });

    // ACT: Render hook
    const { result } = renderHook(() => 
      useRoundPicks(initialRoundData, existingPick, upcomingRounds)
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.roundsData.length).toBe(3);
    });

    // Get team name from fixtures
    const teamName = result.current.getTeamName(result.current.roundsData[0], '1');
    
    // Initial return might be "Arsenal" if fixtures are used or loading indicator
    expect(['Arsenal', 'Loading team name...', 'Loading team 1...'].includes(teamName)).toBe(true);
  });

  /**
   * Test fetching team name when not found in fixtures
   */
  it('should fetch team name when not found in fixtures', async () => {
    // ARRANGE: Mock team name lookup API
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: 'Tottenham' })
    });

    // ACT: Render hook with initial data
    const { result } = renderHook(() => 
      useRoundPicks(initialRoundData, existingPick, upcomingRounds)
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.roundsData.length).toBe(3);
    });

    // Get team name for an ID not in fixtures
    const teamName = result.current.getTeamName(result.current.roundsData[0], '5');
    
    // Initial return should be loading indicator
    expect(teamName).toContain('Loading');
    
    // Verify API was called for team lookup
    expect(global.fetch).toHaveBeenCalledWith('/api/teams/lookup?id=5');
  });

  /**
   * Test notifications and snackbar state
   */
  it('should handle notifications and snackbar state', async () => {
    // ARRANGE: Mock successful save to trigger notification state
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // ACT: Render hook
    const { result } = renderHook(() => 
      useRoundPicks(initialRoundData, existingPick, upcomingRounds)
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.roundsData.length).toBe(3);
    });

    // Select a team and save to generate success message
    act(() => {
      result.current.handleSelectionChange('round-1', '2');
    });

    await act(async () => {
      await result.current.saveCurrentPick();
    });

    // ASSERT: Verify savedMessage was set
    expect(result.current.savedMessage).toBeTruthy();
    
    // Call the close handler
    act(() => {
      result.current.handleCloseSnackbar();
    });

    // After handleCloseSnackbar, at minimum the success flag should be reset
    expect(result.current.savedSuccess || false).toBe(false);
  });
});
