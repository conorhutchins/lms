'use client'; 

import React from 'react';
import Link from 'next/link';
// Import hook (which returns { competitions, loading, error })
import { useCompetitions } from '../../lib/hooks/data/useCompetitions';
// Import type from the correct central location
import { Competition } from '../../lib/types/competition';

// Update props interface to make sport optional
interface CompetitionListProps {
  sport?: string;
}

// Restore function component definition with typed props
export function CompetitionList({ sport }: CompetitionListProps) {
  // Use the simple hook (no arguments, no refetch, direct competitions)
  const { competitions, loading, error } = useCompetitions();

  // --- Add console log here ---
  console.log('[CompetitionList] Data from useCompetitions:', { 
    loading, 
    error, 
    competitions,
    sportProp: sport // Log the sport prop to help with debugging
  });
  // --- End console log ---

  if (loading) {
    return <div>Loading competitions...</div>; 
  }

  if (error) {
    return (
      <div>
        <p>Error loading competitions: {error}</p>
        {/* Cannot use refetch as the simple hook doesn't provide it */}
        {/* <button onClick={() => refetch()}>Try Again</button> */}
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  // --- Filter competitions client-side --- 
  const filteredCompetitions = competitions 
    ? (sport 
        ? competitions.filter(comp => comp.sport && comp.sport.toLowerCase() === sport.toLowerCase())
        : competitions) // If no sport is provided, show all competitions
    : [];

  // Log the result of filtering
  console.log('[CompetitionList] Filtered competitions:', filteredCompetitions);

  if (filteredCompetitions.length === 0) {
    return <p>No {sport ? `active ${sport}` : 'active'} competitions found.</p>;
  }

  // Function to handle entering a competition
  const handleEnterCompetition = (competitionId: string) => {
    console.log(`Entering competition with ID: ${competitionId}`);
    // This is where you would implement the actual entry logic
    // For example, navigate to an entry form or call an API
    alert(`Competition entry feature coming soon! Competition ID: ${competitionId}`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">
        Active {sport ? `${sport.charAt(0).toUpperCase() + sport.slice(1)} ` : ''}Competitions
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompetitions.map((comp: Competition) => ( // Map over filtered list
          <li key={comp.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <Link href={`/competitions/${comp.id}`} className="block">
              <h3 className="text-xl font-medium mb-2">{comp.title}</h3>
              <p className="text-sm text-gray-600">Status: {comp.status}</p>
              <p className="text-sm text-gray-600">Entry Fee: £{comp.entry_fee}</p> 
              <p className="text-sm text-gray-600">Prize Pot: £{comp.prize_pot.toLocaleString()}</p> 
              <p className="text-sm text-gray-600">
                Starts: {new Date(comp.start_date).toLocaleDateString()}
              </p>
            </Link>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleEnterCompetition(comp.id)}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-md font-medium transition-colors"
              >
                Enter
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 