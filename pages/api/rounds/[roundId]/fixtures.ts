// API endpoint for getting the fixtures for a round
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { createApiRouteCookieMethods } from '../../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import { Database } from '../../../../lib/types/supabase';
import { roundServices } from '../../../../lib/db/services/roundService/roundService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the round ID from the query parameters
  const { roundId } = req.query;

  if (typeof roundId !== 'string') {
    return res.status(400).json({ error: 'Invalid round ID' });
  }

  try {
    // Create Supabase client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: createApiRouteCookieMethods(req, res) }
    );

    // Use service method to fetch round with associated fixtures
    const roundResponse = await roundServices.findRoundWithFixtures(supabase, roundId);

    if (roundResponse.error) {
      console.error('Error fetching round with fixtures:', roundResponse.error);
      return res.status(500).json({
        error: roundResponse.error.message || 'Failed to fetch round data'
      });
    }

    if (!roundResponse.data) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Return just the fixtures if the round was found
    return res.status(200).json({
      fixtures: roundResponse.data.fixtures || [],
      round: {
        id: roundResponse.data.id,
        round_number: roundResponse.data.round_number,
        deadline_date: roundResponse.data.deadline_date
      }
    });

  } catch (error) {
    console.error('Unexpected error in rounds/fixtures API:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
} 