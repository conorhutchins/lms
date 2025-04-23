'use client'; 

import React, { useState } from 'react';
import Link from 'next/link';
// Import hook (which returns { competitions, loading, error })
import { useCompetitions } from '../../lib/hooks/data/useCompetitions';
// Import type from the correct central location
import { Competition } from '../../lib/types/competition';
import { useSupabase } from '../../lib/context/SupabaseContext'; // Import useSupabase
import { useRouter } from 'next/navigation'; // Import useRouter for potential redirects

// Update props interface to make sport optional
interface CompetitionListProps {
  sport?: string;
}

// Restore function component definition with typed props
export function CompetitionList({ sport }: CompetitionListProps) {
  const { competitions, loading, error } = useCompetitions();
  const { session } = useSupabase(); // Get session from context
  const router = useRouter(); // Get router instance
  const [enteringCompetitionId, setEnteringCompetitionId] = useState<string | null>(null); // State to track loading
  const [entryError, setEntryError] = useState<string | null>(null); // State for entry errors

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
  const handleEnterCompetition = async (competitionId: string) => {
    setEntryError(null); // Clear previous errors
    if (!session) {
      // Option 1: Redirect to login
      // router.push('/auth/signin'); 
      // Option 2: Show message
      setEntryError('You must be logged in to enter a competition.');
      alert('Please log in to enter.'); // Simple alert for now
      return;
    }

    setEnteringCompetitionId(competitionId); // Set loading state for this button

    try {
      const response = await fetch(`/api/competitions/${competitionId}/enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header is handled by Supabase client via cookies
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to enter competition:', result.error);
        setEntryError(result.error || `Error: ${response.status}`);
        alert(`Failed to enter competition: ${result.error || 'Please try again.'}`); 
      } else {
        console.log('Successfully entered competition:', result);
        alert('Successfully entered competition!');
        // Optional: Refresh competition data or update UI state to reflect entry
        // e.g., you might want to disable the button or change its text
      }
    } catch (err) {
      console.error('Error during fetch:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setEntryError(message);
      alert(`An error occurred: ${message}`);
    } finally {
      setEnteringCompetitionId(null); // Clear loading state
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">
        Active {sport ? `${sport.charAt(0).toUpperCase() + sport.slice(1)} ` : ''}Competitions
      </h2>
      {entryError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {entryError}</span>
          </div>
      )}
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompetitions.map((comp: Competition) => { // Map over filtered list
          const isEntering = enteringCompetitionId === comp.id; // Check if this competition is being entered
          return (
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
                  className={`bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-md font-medium transition-colors ${isEntering ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isEntering || !session} // Disable if entering or not logged in
                >
                  {isEntering ? 'Entering...' : 'Enter'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 