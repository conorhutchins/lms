'use client'; 


// this file is the main component shown on the /competitions/sport/football page it shows a list of competitions and gives functionality to enter them
import React, { useState } from 'react';
import Link from 'next/link';
import { useCompetitions } from '../../lib/hooks/data/useCompetitions'; // { competitions, loading, error }
import { Competition } from '../../lib/types/competition';
import { useSupabase } from '../../lib/context/SupabaseContext';
import { useRouter } from 'next/navigation'; // for redirecting to login

// Props interface for the CompetitionList component
interface CompetitionListProps {
  sport?: string; // optional sport parameter used for filtering
}

// function component with using the typed props above
export function CompetitionList({ sport }: CompetitionListProps) {
  const router = useRouter();
  const { competitions, loading, error } = useCompetitions();
  const { session } = useSupabase();
  const [enteringCompetitionId, setEnteringCompetitionId] = useState<string | null>(null); // Track loading
  const [entryError, setEntryError] = useState<string | null>(null); // State to store entry errors
  const [enteredCompetitionIds, setEnteredCompetitionIds] = useState<Set<string>>(new Set()); // Track competitions entered during this session
  
  if (loading) {
    return <div>Hold on, just loading competitions...</div>; 
  }

  if (error) {
    return (
      <div>
        <p>There has been an error loading competitions: {error}</p>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  // Client side filter of competitions based on the sport prop
  const filteredCompetitions = competitions 
    ? (sport 
        ? competitions.filter(comp => comp.sport && comp.sport.toLowerCase() === sport.toLowerCase())
        : competitions) // If no sport is provided, show all competitions
    : [];

  // When no competitions are found, show a message
  if (filteredCompetitions.length === 0) {
    return <p>No {sport ? `active ${sport}` : 'active'} competitions found</p>;
  }

  // Function to handle competition entry
  const handleEnterCompetition = async (competitionId: string) => {
    setEntryError(null);
    // authentication check
    if (!session) {
      router.push('/login');
      return;
    }

    setEnteringCompetitionId(competitionId); // Set loading state for the enter button it stores the id of the competition being entered

    try {
      // api call to enter the competition
      const response = await fetch(`/api/competitions/${competitionId}/enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      // handle error
      if (!response.ok) {
        console.error('Sadly we failed to enter you into the competition:', result.error);
        setEntryError(result.error || `Error: ${response.status}`);
        // handle already entered
        if (response.status === 409) {
          alert('Looks like you are already in this competition');
          // Add to local state so button updates even if API fails
          setEnteredCompetitionIds(prev => new Set(prev).add(competitionId));
        } else {
          alert(`We failed to enter you into the competition: ${result.error || 'Please try again.'}`); 
        }
      } else {
        // Check if payment is required (for paid competitions)
        if (result.payment_required) {
          alert('This competition requires payment. Redirecting to checkout...');
          router.push(result.checkout_url);
          return;
        }
        
        // Free entry was successful
        alert('Nice one challenger, you are entered into the competition!');
        // Add to local state to update the button
        setEnteredCompetitionIds(prev => new Set(prev).add(competitionId));
        router.push(`/competitions/${competitionId}/picks`); // redirect to the picks page if successful entry
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
          // Check if successfully entered during this component's lifetime or if API indicated already entered
          const hasEnteredLocally = enteredCompetitionIds.has(comp.id);
          return (
            <li key={comp.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <Link href={`/competitions/${comp.id}`} className="block">
                <h3 className="text-xl font-medium mb-2 text-orange-500 text-center">{comp.title}</h3>
                <p className="text-md text-white text-center">Status: {comp.status}</p>
                <p className="text-md text-white text-center">Entry Fee: £{comp.entry_fee}</p> 
                <p className="text-md text-white text-center">
                  Starts: {new Date(comp.start_date).toLocaleDateString()}
                </p>
                <p className="text-md text-white text-center">Current Prize Pot: £{comp.prize_pot.toLocaleString()}</p> 
              </Link>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    if (hasEnteredLocally) {
                      router.push(`/competitions/${comp.id}`);
                    } else {
                      handleEnterCompetition(comp.id);
                    }
                  }}
                  className={`text-white py-2 px-6 rounded-md font-medium transition-colors 
                    ${hasEnteredLocally 
                      ? 'bg-green-600 hover:bg-green-700' // Style for "Go to Picks"
                      : isEntering 
                        ? 'bg-purple-600 opacity-50 cursor-wait' // Style for "Entering..."
                        : 'bg-purple-600 hover:bg-purple-700' // Default style for "Enter Competition"
                    }`}
                  disabled={isEntering || (!session && !hasEnteredLocally)} // Only disable if entering, or if not logged in AND not already entered
                >
                  {hasEnteredLocally ? 'View Competition' : isEntering ? 'Entering...' : 'Enter Competition'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 