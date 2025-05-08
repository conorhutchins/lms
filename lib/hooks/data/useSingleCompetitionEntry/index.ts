import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { CompetitionWithRounds } from '../../../db/services/competition';

type UseSingleCompetitionEntryReturn = {
  // Entry status
  isEntered: boolean | null;
  isLoadingEntryStatus: boolean;
  entryStatusError: string | null;
  
  // Entry action
  isEnteringCompetition: boolean;
  enterCompetitionError: string | null;
  enterCompetition: () => Promise<void>;
  
  // UI helpers
  getFirstRoundPicksUrl: () => string;
};

/**
 * Hook to manage entry status and actions for a single competition
 * @param competition The competition being viewed
 * @param session The user's current session
 * @returns Entry-related state and actions
 */
export function useSingleCompetitionEntry(
  competition: CompetitionWithRounds | undefined,
  session: Session | null
): UseSingleCompetitionEntryReturn {
  const [isEntered, setIsEntered] = useState<boolean | null>(null);
  const [isLoadingEntryStatus, setIsLoadingEntryStatus] = useState(true);
  const [entryStatusError, setEntryStatusError] = useState<string | null>(null);
  const [isEnteringCompetition, setIsEnteringCompetition] = useState(false);
  const [enterCompetitionError, setEnterCompetitionError] = useState<string | null>(null);

  // Check if user has entered this competition
  useEffect(() => {
    const checkEntryStatus = async () => {
      if (!session || !competition?.id) {
        setIsLoadingEntryStatus(false);
        setIsEntered(false);
        return;
      }

      setIsLoadingEntryStatus(true);
      setEntryStatusError(null);
      
      try {
        const response = await fetch(`/api/competitions/${competition.id}/entry-status`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setIsEntered(data.isEntered);
      } catch (err) {
        console.error('Error fetching entry status:', err);
        setEntryStatusError(err instanceof Error ? err.message : 'Failed to load entry status');
        setIsEntered(null);
      } finally {
        setIsLoadingEntryStatus(false);
      }
    };

    checkEntryStatus();
  }, [session, competition?.id]);

  // Handle competition entry
  const enterCompetition = async () => {
    if (!session || !competition?.id) {
      alert('Please log in to enter this competition.');
      return;
    }

    setIsEnteringCompetition(true);
    setEnterCompetitionError(null);

    try {
      const response = await fetch(`/api/competitions/${competition.id}/enter`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error: ${response.status}`);
      }
      
      alert('Successfully entered competition!');
      setIsEntered(true);
    } catch (err) {
      console.error('Failed to enter competition:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setEnterCompetitionError(message);
      alert(`Failed to enter: ${message}`);
    } finally {
      setIsEnteringCompetition(false);
    }
  };

  // Helper to get link to first round picks page
  const getFirstRoundPicksUrl = (): string => {
    const firstRound = competition?.rounds?.[0];
    return firstRound 
      ? `/competitions/${competition.id}/rounds/${firstRound.id}/picks` 
      : '#'; // Fallback if no rounds
  };

  return {
    isEntered,
    isLoadingEntryStatus,
    entryStatusError,
    isEnteringCompetition,
    enterCompetitionError,
    enterCompetition,
    getFirstRoundPicksUrl
  };
} 