import { GetServerSideProps, InferGetServerSidePropsType, NextApiRequest, NextApiResponse } from 'next';
import { competitionServices, CompetitionError, CompetitionWithRounds } from '../../lib/db/services/competition';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../lib/types/supabase';
import { createApiRouteCookieMethods } from '../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import React from 'react';

// Define the props type, including the fetched competition data or error
type CompetitionDetailPageProps = {
  competition?: CompetitionWithRounds; // Use the type from the service
  error?: string;
};

export const getServerSideProps: GetServerSideProps<CompetitionDetailPageProps> = async (context) => {
  const { id } = context.params || {}; // Get competition ID from URL
  const { req, res } = context;

  if (typeof id !== 'string') {
    return { props: { error: 'Invalid competition ID.' } }; // Or redirect, or return 404
  }

  // Create Supabase client using the correct helper
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req as NextApiRequest, res as NextApiResponse) }
  );

  // Optional: Check user session if needed for auth-gated content
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session) { /* Handle redirect or props indicating auth needed */ }

  try {
    console.log(`Fetching competition details for ID: ${id}`);
    const serviceResponse = await competitionServices.findCompetitionById(supabase, id);

    if (serviceResponse.error) {
      console.error('Error fetching competition:', serviceResponse.error);
      let errorMessage = 'Failed to load competition details.';
      // Provide more specific messages based on error code
      if (serviceResponse.error instanceof CompetitionError) {
        if (serviceResponse.error.code === 'NOT_FOUND') {
          // Return notFound: true to render the 404 page
          return { notFound: true };
        }
        errorMessage = serviceResponse.error.message;
      }
      return { props: { error: errorMessage } };
    }

    if (!serviceResponse.data) {
        return { notFound: true }; // Should be caught by NOT_FOUND error, but handle defensively
    }

    console.log(`Successfully fetched competition: ${serviceResponse.data.title}`);
    // Pass fetched competition data as props
    return { props: { competition: serviceResponse.data } };

  } catch (error) {
    console.error('Unexpected error in getServerSideProps for competition:', error);
    return { props: { error: 'An unexpected server error occurred.' } };
  }
};

// The actual page component
export default function CompetitionDetailPage({ 
  competition, 
  error 
}: InferGetServerSidePropsType<typeof getServerSideProps>) {

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>;
  }

  if (!competition) {
    // This case should ideally be handled by getServerSideProps returning notFound or error
    return <div className="container mx-auto p-4">Competition not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{competition.title}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 bg-gray-100 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Details</h2>
          <p><strong>Sport:</strong> {competition.sport}</p>
          <p><strong>Status:</strong> {competition.status}</p>
          <p><strong>Starts:</strong> {new Date(competition.start_date).toLocaleDateString()}</p>
          <p><strong>Entry Fee:</strong> £{competition.entry_fee.toLocaleString()}</p>
          <p><strong>Current Prize Pot:</strong> £{competition.prize_pot.toLocaleString()}</p>
          {/* Add other details like rules, description etc. */}
        </div>
        <div className="bg-gray-100 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Actions</h2>
          {/* TODO: Add Join/Enter Competition Button (conditional) */} 
          {/* TODO: Add Make/View Picks Button (conditional) */} 
          <button className="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50" disabled>
            Join Competition (Coming Soon)
          </button>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-3">Rounds</h2>
        {competition.rounds && competition.rounds.length > 0 ? (
          <ul className="space-y-2">
            {competition.rounds.map((round) => (
              <li key={round.id} className="border p-3 rounded-md bg-white shadow-sm">
                <p className="font-medium">Round {round.round_number}</p>
                <p className="text-sm text-gray-600">
                  Deadline: {new Date(round.deadline_date).toLocaleString()}
                </p>
                {/* TODO: Add link/button to view round details or make pick for this round */}
              </li>
            ))}
          </ul>
        ) : (
          <p>No rounds found for this competition yet.</p>
        )}
      </div>
    </div>
  );
} 