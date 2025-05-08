import React from 'react';
import Link from 'next/link';
import { CompetitionWithRounds } from '../../lib/db/services/competition';

// shows a list of the rounds for a competition. currently shown on /competitions/[competitionId].tsx
type CompetitionRoundsProps = {
  competition: CompetitionWithRounds;
  isEntered: boolean | null;
};

// formats a date to show time in GMT followed by date
const formatDeadline = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Format time in GMT/UTC
  const timeString = date.toLocaleTimeString('en-GB', { 
    hour: 'numeric', 
    minute: '2-digit',
    timeZone: 'GMT'
  });
  
  // Format date
  const dateFormatted = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  return `${timeString} GMT on ${dateFormatted}`;
};

/**
 * Checks if a round is within the 5-game week window for making picks
 */
const isWithinPickWindow = (deadlineDate: string): boolean => {
  const now = new Date();
  const deadline = new Date(deadlineDate);
  
  // Calculate approximately 5 weeks in milliseconds
  // 5 weeks * 7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  const fiveWeeksInMs = 5 * 7 * 24 * 60 * 60 * 1000;
  
  // Check if deadline is in the future but within 5 weeks
  return deadline > now && (deadline.getTime() - now.getTime()) <= fiveWeeksInMs;
};

// main component
export function CompetitionRounds({ competition, isEntered }: CompetitionRoundsProps) {
  const { rounds = [] } = competition;
  
  // Sort rounds by round number
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);
  
  // Find the current round (first available round that hasn't passed)
  const now = new Date();
  const currentRound = sortedRounds.find(round => {
    const deadline = new Date(round.deadline_date);
    return deadline > now && isWithinPickWindow(round.deadline_date);
  });
  
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
      {sortedRounds.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedRounds.map((round) => {
            const deadline = new Date(round.deadline_date);
            const isPast = deadline < new Date();
            const isAvailable = isWithinPickWindow(round.deadline_date);
            const isCurrentRound = currentRound && round.id === currentRound.id;
            
            // Determine round status
            let status = 'future';
            if (isPast) {
              status = 'past';
            } else if (isAvailable) {
              status = 'available';
            }
            
            return (
              <div 
                key={round.id} 
                className={`${isCurrentRound ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-800' : ''} 
                  border rounded-lg overflow-hidden ${
                  status === 'past' ? 'border-gray-600 bg-gray-900' : 
                  status === 'available' ? 'border-purple-700 bg-gray-900' :
                  'border-gray-700 bg-gray-900'
                }`}
              >
                <div className={`py-2 px-4 relative ${
                  status === 'past' ? 'bg-gray-700' : 
                  status === 'available' ? 'bg-gradient-to-r from-purple-700 to-purple-900' :
                  'bg-gray-700'
                }`}>
                  <h3 className="font-medium text-white text-center">Round {round.round_number}</h3>
                  {isCurrentRound && (
                    <span className="bg-green-500 text-xs text-white px-2 py-0.5 rounded-full font-medium absolute right-3 top-1/2 -translate-y-1/2">
                      Current
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start mb-3">
                    <svg className="h-5 w-5 text-purple-400 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-purple-300">Deadline</p>
                      <p className="text-sm text-gray-400">{formatDeadline(round.deadline_date)}</p>
                    </div>
                  </div>
                  
                  {status === 'future' && (
                    <div className="bg-gray-800 border border-gray-700 rounded p-2 mt-2">
                      <p className="text-xs text-gray-400">
                        Picks will open closer to the round date. You can only make picks for game weeks within 5 weeks of today.
                      </p>
                    </div>
                  )}
                  
                  {isEntered && (
                    <Link 
                      href={status === 'available' ? `/competitions/${competition.id}/rounds/${round.id}/picks` : '#'}
                      className={`block w-full text-center py-2 px-4 rounded mt-3 transition-colors ${
                        status === 'past'
                          ? 'bg-gray-600 text-gray-300 cursor-default'
                          : status === 'available'
                            ? `${isCurrentRound ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                      onClick={status !== 'available' ? (e) => e.preventDefault() : undefined}
                    >
                      {status === 'past' 
                        ? 'Deadline Passed' 
                        : status === 'available' 
                          ? isCurrentRound ? 'Make Pick for this round' : 'Make Picks' 
                          : 'Opens Later'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-300">
          <p>No rounds have been added to this competition yet.</p>
          <p className="text-sm text-gray-400 mt-2">Check back soon for updates.</p>
        </div>
      )}
    </div>
  );
} 