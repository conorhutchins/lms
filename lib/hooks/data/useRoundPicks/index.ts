// custom hook to manage round picks, it can handle multiple rounds

import { useState, useEffect, useCallback } from 'react';
import type { Pick } from '../../../types/pick';
import { RoundWithCompetitionAndFixtures } from '../../../db/services/roundService';

// Updated RoundWithFixturesAndPick type without explicit fixtures field
export type RoundWithFixturesAndPick = RoundWithCompetitionAndFixtures & {
  existingPick?: Pick | null;
  status?: 'PAST' | 'CURRENT' | 'UPCOMING' | 'FUTURE';
  is_selectable?: boolean;
  is_past?: boolean;
};

// Extend Pick type to include team_name
export interface PickWithTeamName extends Pick {
  team_name?: string;
}

export function useRoundPicks(
  initialRoundData: RoundWithCompetitionAndFixtures | undefined,
  existingPick: Pick | null | undefined,
  upcomingRounds: Array<{
    id: string;
    round_number: number;
    deadline_date: string;
    competition_id: string;
    existingPick: Pick | null;
    is_past?: boolean;
  }> = []
) {
  // State management
  const [roundsData, setRoundsData] = useState<RoundWithFixturesAndPick[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  // Add a cache for team names to avoid duplicate API calls
  const [teamNameCache, setTeamNameCache] = useState<Record<string, string>>({});
  const [teamNameLoading, setTeamNameLoading] = useState<Record<string, boolean>>({});

  // Function to load fixtures for a specific round
  const loadRoundFixtures = useCallback(async (roundId: string) => {
    // Check if we already have fixtures for this round
    const round = roundsData.find(r => r.id === roundId);
    
    if (round && round.fixtures && round.fixtures.length > 0) {
      // We already have fixtures, no need to load
      return;
    }
    
    try {
      // Fetch round with fixtures
      const response = await fetch(`/api/rounds/${roundId}/fixtures`);
      
      if (!response.ok) {
        throw new Error(`Failed to load fixtures for round ${roundId}`);
      }
      
      const data = await response.json();
      
      // Update round data with fixtures
      setRoundsData(prev => prev.map(r => 
        r.id === roundId 
          ? { ...r, fixtures: data.fixtures || [] }
          : r
      ));
      
    } catch (err) {
      console.error(`Error loading fixtures for round ${roundId}:`, err);
    }
  }, [roundsData]);

  // Handle selection changes
  const handleSelectionChange = useCallback((roundId: string, teamId: string) => {
    setSelections(prev => ({
      ...prev,
      [roundId]: teamId
    }));
    
    setSaveError(null); // Clear error when selection changes
  }, []);

  // Save a pick for the current round
  const saveCurrentPick = useCallback(async () => {
    if (activeTabIndex < 0 || activeTabIndex >= roundsData.length) {
      return;
    }
    
    const currentRound = roundsData[activeTabIndex];
    const teamId = selections[currentRound.id];
    
    if (!teamId) {
      setSaveError('Please select a team for this round.');
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roundId: currentRound.id, 
          teamId: teamId,
          isExternalId: true // We're using external API IDs, not internal UUIDs
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save pick');
      }
      
      // Handle success
      setSavedMessage(`Successfully saved your pick for Round ${currentRound.round_number}!`);
      setSavedSuccess(true);
      
    } catch (err) {
      console.error("Save pick error:", err);
      setSaveError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSaving(false);
    }
  }, [activeTabIndex, roundsData, selections]);

  // Save all picks
  const saveAllPicks = useCallback(async () => {
    // Validate that at least one selection was made
    const selectionsArray = Object.entries(selections).filter(([, teamId]) => teamId !== null);
    
    if (selectionsArray.length === 0) {
      setSaveError('Please select at least one team.');
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Format picks for the batch API
      const picks = selectionsArray.map(([roundId, teamId]) => {
        return {
          roundId,
          teamId,
          isExternalId: true // We're using the external API ID, not internal UUIDs
        };
      });
      
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save picks');
      }
      
      // Handle success
      if (result.errorCount > 0) {
        // Some picks failed
        setSaveError(`Saved ${result.successCount} picks with ${result.errorCount} errors. Check browser console for details.`);
        
        // Log detailed errors
        if (result.results) {
          const errors = result.results.filter((r: {success: boolean}) => !r.success);
          console.error('Pick save errors:', errors);
        }
      } else {
        // All picks saved successfully
        setSavedMessage(`Successfully saved ${result.successCount} picks!`);
        setSavedSuccess(true);
      }
      
    } catch (err) {
      console.error("Save picks error:", err);
      setSaveError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSaving(false);
    }
  }, [selections]);

  // Team name resolution
  const getTeamName = useCallback((round: RoundWithFixturesAndPick, teamId: number | string | null | undefined): string => {
    if (teamId === null || teamId === undefined) return 'Unknown Team';
    
    // Convert teamId to string for comparison
    const teamIdStr = teamId.toString();
    
    // Check if we already have the team name in our cache
    if (teamNameCache[teamIdStr]) {
      return teamNameCache[teamIdStr];
    }
    
    // If fixtures aren't loaded yet, trigger load and show loading state
    if (!round.fixtures || round.fixtures.length === 0) {
      loadRoundFixtures(round.id);
      return "Loading team name...";
    }
    
    // Try to find the team name from the fixtures
    const homeTeam = round.fixtures.find(f => f.home_team_id?.toString() === teamIdStr);
    if (homeTeam && homeTeam.home_team) {
      // Update cache with non-null string value
      const teamName: string = homeTeam.home_team;
      setTeamNameCache(prev => ({ ...prev, [teamIdStr]: teamName }));
      return teamName;
    }
    
    const awayTeam = round.fixtures.find(f => f.away_team_id?.toString() === teamIdStr);
    if (awayTeam && awayTeam.away_team) {
      // Update cache with non-null string value
      const teamName: string = awayTeam.away_team;
      setTeamNameCache(prev => ({ ...prev, [teamIdStr]: teamName }));
      return teamName;
    }
    
    // If we have an existing pick that stores the team name, use that
    const existingPick = round.existingPick as PickWithTeamName;
    
    if (existingPick && existingPick.team_id === teamIdStr && existingPick.team_name) {
      // Update cache with non-null string value
      const teamName: string = existingPick.team_name;
      setTeamNameCache(prev => ({ ...prev, [teamIdStr]: teamName }));
      return teamName;
    }
    
    // More aggressive approach to find the team name by searching all fixtures
    for (const fixture of round.fixtures || []) {
      // Check home team
      if (fixture.home_team_id?.toString() === teamIdStr && fixture.home_team) {
        console.log(`Found team name ${fixture.home_team} from home_team for ID ${teamIdStr}`);
        // Update cache with non-null string value
        const teamName: string = fixture.home_team;
        setTeamNameCache(prev => ({ ...prev, [teamIdStr]: teamName }));
        return teamName;
      }
      
      // Check away team
      if (fixture.away_team_id?.toString() === teamIdStr && fixture.away_team) {
        console.log(`Found team name ${fixture.away_team} from away_team for ID ${teamIdStr}`);
        // Update cache with non-null string value
        const teamName: string = fixture.away_team;
        setTeamNameCache(prev => ({ ...prev, [teamIdStr]: teamName }));
        return teamName;
      }
    }
    
    // If we get here, we're going to directly fetch from the teams table
    // But avoid duplicate fetches for the same team ID
    if (!teamNameLoading[teamIdStr]) {
      setTeamNameLoading(prev => ({ ...prev, [teamIdStr]: true }));
      
      // This adds a new side effect to the component - fetching team info
      const fetchTeamName = async () => {
        try {
          console.log(`Fetching team name for ID ${teamIdStr}`);
          const response = await fetch(`/api/teams/lookup?id=${encodeURIComponent(teamIdStr)}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.name) {
              console.log(`Found team name ${data.name} for ID ${teamIdStr} via API`);
              // Update the cache with the name
              setTeamNameCache(prev => ({ ...prev, [teamIdStr]: data.name }));
              
              // Update the round data with the name so we don't have to fetch again
              setRoundsData(prev => prev.map(r => {
                if (r.id !== round.id) return r;
                
                // Add this team name to any fixtures it's in
                const updatedFixtures = (r.fixtures || []).map(f => {
                  if (f.home_team_id?.toString() === teamIdStr) {
                    return { ...f, home_team: data.name };
                  }
                  if (f.away_team_id?.toString() === teamIdStr) {
                    return { ...f, away_team: data.name };
                  }
                  return f;
                });
                
                return { ...r, fixtures: updatedFixtures };
              }));
            }
          }
        } catch (error) {
          console.error(`Error fetching team name for ID ${teamIdStr}:`, error);
        } finally {
          // Mark as no longer loading
          setTeamNameLoading(prev => ({ ...prev, [teamIdStr]: false }));
        }
      };
      
      // Trigger the fetch
      fetchTeamName();
    }
    
    // Log for debugging
    console.warn(`Could not find team name for ID ${teamIdStr} in round ${round.id}, attempting fetch`, {
      fixturesCount: round.fixtures?.length || 0,
      teamIds: round.fixtures?.map(f => [f.home_team_id, f.away_team_id]).flat().filter(Boolean)
    });
    
    // Return a loading indicator while we fetch
    return `Loading team ${teamIdStr.substring(0, 8)}...`;
  }, [loadRoundFixtures, setRoundsData, teamNameCache, teamNameLoading]);

  // When Tab changes
  const handleTabChange = useCallback((newIndex: number) => {
    setActiveTabIndex(newIndex);
    
    // Load fixtures for the selected round if needed
    if (roundsData[newIndex]) {
      loadRoundFixtures(roundsData[newIndex].id);
    }
  }, [roundsData, loadRoundFixtures]);

  // Handle notification state
  const handleCloseSnackbar = useCallback(() => {
    setSavedSuccess(false);
  }, []);

  // Initialize rounds data and selections on mount
  useEffect(() => {
    if (initialRoundData) {
      // Get current date for comparison
      const now = new Date();
      
      const initialRounds = [{
        ...initialRoundData,
        existingPick: existingPick,
        // If deadline has passed, mark as past
        is_past: new Date(initialRoundData.deadline_date) < now
      }];
      
      // Add placeholder objects for upcoming rounds
      const allRounds = [
        ...upcomingRounds.map(round => ({
          ...round,
          competitions: initialRoundData.competitions, // Share the competition data
          fixtures: [], // Empty fixtures will be loaded on tab change
          is_past: new Date(round.deadline_date) < now
        }))
      ];
      
      // Create a combined array with all rounds
      // Use double casting through unknown to completely bypass type checking
      const combinedRounds = [...allRounds] as unknown as RoundWithFixturesAndPick[];
      
      // Insert the current round - also use double casting
      initialRounds.forEach(round => {
        combinedRounds.push(round as unknown as RoundWithFixturesAndPick);
      });
      
      // Sort all rounds by round_number to ensure chronological order for navigation
      combinedRounds.sort((a, b) => a.round_number - b.round_number);
      
      // Find the index of the current round after sorting
      const currentRoundIndex = combinedRounds.findIndex(r => r.id === initialRoundData.id);
      
      // Determine which round is CURRENT based on deadlines
      // Look for the first round with a future deadline - that's our CURRENT round
      let currentDeadlineIndex = combinedRounds.findIndex(r => 
        new Date(r.deadline_date) > now
      );
      
      // If all deadlines have passed, then no round is current
      if (currentDeadlineIndex === -1) {
        // All rounds have passed, so none are current
        currentDeadlineIndex = -1;
      }
      
      // Update round statuses based on window logic
      const updatedRounds = combinedRounds.map((round, index) => {
        // Always respect past flag for rounds where deadline has passed
        if (round.is_past) {
          return {
            ...round,
            status: 'PAST',
            is_selectable: false
          };
        }
        
        // If we found a current round, use sliding window logic
        if (currentDeadlineIndex !== -1) {
          if (index === currentDeadlineIndex) {
            // This is the CURRENT round (with the next upcoming deadline)
            return {
              ...round,
              status: 'CURRENT',
              is_selectable: true
            };
          } else if (index > currentDeadlineIndex && index <= currentDeadlineIndex + 4) {
            // This is one of the 4 UPCOMING rounds in our sliding window
            return {
              ...round,
              status: 'UPCOMING',
              is_selectable: true
            };
          } else if (index > currentDeadlineIndex + 4) {
            // This is a FUTURE round (beyond our sliding window)
            return {
              ...round,
              status: 'FUTURE',
              is_selectable: false
            };
          }
        }
        
        // Default case - a past round
        return {
          ...round,
          status: 'PAST',
          is_selectable: false
        };
      });
      
      // Set the rounds data, using double casting
      setRoundsData(updatedRounds as unknown as RoundWithFixturesAndPick[]);
      setActiveTabIndex(currentRoundIndex >= 0 ? currentRoundIndex : 0);
      
      // Initialize selections with existing picks
      const initialSelections: Record<string, string | null> = {};
      
      // Add the initial round's selection
      if (existingPick?.team_id) {
        initialSelections[initialRoundData.id] = existingPick.team_id;
      } else {
        initialSelections[initialRoundData.id] = null;
      }
      
      // Add selections from upcoming rounds with existing picks
      upcomingRounds.forEach(round => {
        if (round.existingPick?.team_id) {
          initialSelections[round.id] = round.existingPick.team_id;
        } else {
          initialSelections[round.id] = null;
        }
      });
      
      setSelections(initialSelections);
    }
  }, [initialRoundData, existingPick, upcomingRounds]);

  // When selections change, make sure fixtures are loaded for all rounds with selections
  useEffect(() => {
    // Identify all rounds that have selections but might not have fixtures loaded
    Object.entries(selections).forEach(([roundId, teamId]) => {
      if (teamId) {
        const round = roundsData.find(r => r.id === roundId);
        if (round && (!round.fixtures || round.fixtures.length === 0)) {
          loadRoundFixtures(roundId);
        }
      }
    });
  }, [selections, roundsData, loadRoundFixtures]);

  // Return all the state and handlers
  return {
    // State
    roundsData,
    activeTabIndex,
    selections,
    isSaving,
    saveError,
    savedSuccess,
    savedMessage,
    teamNameCache,
    
    // Actions
    handleTabChange,
    handleSelectionChange,
    saveCurrentPick,
    saveAllPicks,
    loadRoundFixtures,
    getTeamName,
    handleCloseSnackbar,
    
    // Computed
    currentRound: roundsData[activeTabIndex], // current round object based on what tab is selected
    isCurrentRoundSelectable: roundsData[activeTabIndex]?.is_selectable || false, // boolean to check if the current round is selectable
    hasCurrentRoundDeadlinePassed:  // quick check to see if the current round deadline has passed
      roundsData[activeTabIndex] ? 
      new Date(roundsData[activeTabIndex].deadline_date) <= new Date() || 
      roundsData[activeTabIndex].is_past === true : false
  };
} 