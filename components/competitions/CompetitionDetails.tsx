import React from 'react';
import { CompetitionWithRounds } from '../../lib/db/services/competition';

type CompetitionDetailsProps = {
  competition: CompetitionWithRounds;
};

// Displays detailed information about a competition
export function CompetitionDetails({ competition }: CompetitionDetailsProps) {
  return (
    <div className="md:col-span-2 p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Details of the Competition</h2>
      
      {/* Prize pot section with emphasis */}
      <div className="bg-green-50 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-medium text-green-800 mb-1">Current Prize Pot</h3>
        <p className="text-3xl font-bold text-green-600">£{competition.prize_pot.toLocaleString()}</p>
        {competition.rolled_over && (
          <p className="mt-1 text-sm text-green-700">
            This prize includes funds rolled over from a previous competition
          </p>
        )}
      </div>
      
      {/* Other details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <p><strong>Sport:</strong> {competition.sport}</p>
        <p><strong>Status:</strong> {competition.status}</p>
        <p><strong>Start Date:</strong> {new Date(competition.start_date).toLocaleDateString()}</p>
        <p><strong>Entry Fee:</strong> £{competition.entry_fee.toLocaleString()}</p>
        <p><strong>Rolled Over:</strong> {competition.rolled_over ? 'Yes' : 'No'}</p>
      </div>
      
      {/* Description section */}
      {competition.description && (
        <div className="mt-4 border-t pt-3">
          <h3 className="font-semibold mb-2">Description</h3>
          <p className="text-gray-300">{competition.description}</p>
        </div>
      )}
    </div>
  );
} 