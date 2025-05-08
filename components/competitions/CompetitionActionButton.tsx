// This component is used to display a button that allows a user to enter a competition its shown on /competitions/[competitionId]
import React from 'react';
import Link from 'next/link';
import { Session } from '@supabase/supabase-js';
import { CompetitionWithRounds } from '../../lib/db/services/competition';

type CompetitionActionButtonProps = {
  isEntered: boolean | null;
  isLoadingEntryStatus: boolean;
  entryStatusError: string | null;
  isEnteringCompetition: boolean;
  enterCompetition: () => Promise<void>;
  picksUrl: string;
  hasRounds: boolean;
  session: Session | null;
  currentRound?: number;
  competition: CompetitionWithRounds;
};

/**
 * Button that adapts based on competition entry state
 * - Not logged in → "Log in to Enter"
 * - Loading → "Checking Status..."
 * - Error → Shows error
 * - Entered → "Make Your Picks" link
 * - Not entered → "Enter Competition" button
 */
export function CompetitionActionButton({
  isEntered,
  isLoadingEntryStatus,
  entryStatusError,
  isEnteringCompetition,
  enterCompetition,
  picksUrl,
  hasRounds,
  session,
  currentRound,
  competition
}: CompetitionActionButtonProps) {
  // Not logged in
  if (!session) {
    return (
      <button 
        className="mt-2 w-full bg-gray-600 text-white py-3 px-6 rounded-md font-medium cursor-not-allowed shadow-sm"
        disabled
      >
        Log in to Enter
      </button>
    );
  }

  // Loading entry status
  if (isLoadingEntryStatus) {
    return (
      <button 
        className="mt-2 w-full bg-purple-800 text-white py-3 px-6 rounded-md font-medium cursor-wait shadow-sm"
        disabled
      >
        <span className="inline-block mr-2">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
        Checking Status...
      </button>
    );
  }

  // Error checking status
  if (entryStatusError) {
    return (
      <div className="mt-2 bg-gray-900 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-400">Error checking status: {entryStatusError}</p>
          </div>
        </div>
      </div>
    );
  }

  // User is entered so show link to make picks
  if (isEntered === true) {
    return (
      <>
        <p className="text-gray-300 mb-4 text-center">Make your picks for the current round below.</p>
        <Link 
          href={picksUrl}
          aria-disabled={!hasRounds}
          className={`block w-full text-center py-3 px-6 rounded-md font-medium transition-all ${
            !hasRounds 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-sm' 
              : 'bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
          }`}
        >
          Make Your Picks {hasRounds 
            ? currentRound 
              ? `(Round ${currentRound})` 
              : '(Round 1)' 
            : '(No Rounds Available Yet)'}
        </Link>
      </>
    );
  }

  // User is not entered - Show Enter button
  return (
    <>
      <div className="text-center mb-4">
        <p className="text-gray-300">
          Join this competition for £{competition.entry_fee.toLocaleString()} and get a chance to win 
          <span className="font-semibold text-purple-400"> £{competition.prize_pot.toLocaleString()}</span>
        </p>
      </div>
      <div className="mb-4 flex justify-center">
        <div className="bg-gray-900 border-l-4 border-purple-500 text-gray-300 p-3 rounded shadow-sm text-sm max-w-sm">
          <div className="flex">
            <div className="flex-shrink-0 mr-2">
              <svg className="h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p>Entry closes when the first round begins.</p>
          </div>
        </div>
      </div>
      <button 
        onClick={enterCompetition}
        className={`w-full py-3 px-6 rounded-md font-medium transition-all ${
          isEnteringCompetition 
            ? 'bg-purple-700 text-white opacity-75 cursor-wait shadow-sm' 
            : 'bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
        }`}
        disabled={isEnteringCompetition}
      >
        {isEnteringCompetition ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Entering...
          </span>
        ) : 'Enter Competition'}
      </button>
    </>
  );
} 