'use client'; // allows use of client side hooks

// This page is used to display details of a competition and allow users to enter

import { GetServerSideProps, InferGetServerSidePropsType, NextApiRequest, NextApiResponse } from 'next'; // get infer is just a helper to take off prop types from the server side props
import { competitionServices, CompetitionWithRounds } from '../../lib/db/services/competitionService/competition'; 
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../lib/types/supabase';
import { createApiRouteCookieMethods } from '../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import React from 'react';
import { useSupabase } from '../../lib/context/SupabaseContext';

// Import the custom components and hook
import { CompetitionDetails } from '../../components/competitions/CompetitionDetails';
import { CompetitionActionButton } from '../../components/competitions/CompetitionActionButton';
import { CompetitionRounds } from '../../components/competitions/CompetitionRounds';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { useSingleCompetitionEntry } from '../../lib/hooks/data/useSingleCompetitionEntry'; // manages competition entry

// Props we will receive from the server side and pass to the page component
type CompetitionDetailPageProps = {
  competition?: CompetitionWithRounds; 
  error?: string;
};

// Server side data fetching
export const getServerSideProps: GetServerSideProps<CompetitionDetailPageProps> = async (context) => {
  const { competitionId } = context.params || {}; 
  const { req, res } = context;

  if (typeof competitionId !== 'string') { 
    return { props: { error: 'That was an invalid competition ID.' } }; 
  }

  // Create Supabase client using the correct helper
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req as NextApiRequest, res as NextApiResponse) }
  );

  try {
    console.log(`Fetching competition details for ID: ${competitionId}`);
    const serviceResponse = await competitionServices.findCompetitionById(supabase, competitionId);

    // Handle NOT_FOUND by showing a 404 page
    if (serviceResponse.error?.code === 'NOT_FOUND') {
      return { notFound: true };
    }
    
    // For other errors return the error message from the service as a prop
    if (serviceResponse.error) {
      return { props: { error: serviceResponse.error.message || 'Failed to load competition details.' } };
    }

    return { props: { competition: serviceResponse.data  ?? undefined } };
  } catch (error) {
    console.error('Unexpected error in getServerSideProps for competition:', error);
    return { props: { error: 'An unexpected server error occurred.' } };
  }
};

// The main page component
export default function CompetitionDetailPage({ 
  competition, 
  error 
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { session } = useSupabase(); // get the session from the supabase context
  
  // Use our custom hook to manage competition entry
  const {
    isEntered,
    isLoadingEntryStatus,
    entryStatusError,
    isEnteringCompetition,
    enterCompetitionError,
    enterCompetition,
    getFirstRoundPicksUrl
  } = useSingleCompetitionEntry(competition, session);

  // Error handling
  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>;
  }

  if (!competition) {
    return <div className="container mx-auto p-4">Competition not found.</div>;
  }

  // Check the competition has rounds
  const hasRounds = competition.rounds && competition.rounds.length > 0;
  
  // Calculate current round based on dates and status
  const getCurrentRound = (): number | undefined => {
    if (!hasRounds || !competition.rounds || competition.rounds.length === 0) {
      return undefined;
    }
    
    // Sort rounds by round_number to ensure correct order
    const sortedRounds = [...competition.rounds].sort((a, b) => a.round_number - b.round_number);
    
    // If there are no rounds after sorting (defensive check)
    if (sortedRounds.length === 0) {
      return undefined;
    }
    
    const now = new Date();
    
    // Find the next upcoming round (where deadline is in the future)
    const nextRound = sortedRounds.find(round => {
      const deadlineDate = new Date(round.deadline_date);
      return deadlineDate > now;
    });
    
    // If found a future round, return it
    if (nextRound) {
      return nextRound.round_number;
    }
    
    // Otherwise return the last round (competition might be finished)
    return sortedRounds[sortedRounds.length - 1].round_number;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{competition.title}</h1>
      
      {/* Display error if entry failed */}
      {enterCompetitionError && <ErrorAlert message={enterCompetitionError} />}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Competition details section */}
        <CompetitionDetails competition={competition} />
        
        {/* Actions section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">
            {isEntered ? 'Nice one! You\'re In!' : 'Ready to Compete?'}
          </h2>
          <CompetitionActionButton
            isEntered={isEntered}
            isLoadingEntryStatus={isLoadingEntryStatus}
            entryStatusError={entryStatusError}
            isEnteringCompetition={isEnteringCompetition}
            enterCompetition={enterCompetition}
            picksUrl={getFirstRoundPicksUrl()}
            hasRounds={hasRounds}
            session={session}
            currentRound={getCurrentRound()}
            competition={competition}
          />
        </div>
      </div>
      
      {/* Rounds section */}
      <CompetitionRounds 
        competition={competition}
        isEntered={isEntered}
      />
    </div>
  );
} 