// this file creates the API endpoint for the gameweeks page we can call on the frontend later

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../lib/types/supabase';
import { gameweekServices, GameweekError } from '../../lib/db/services/gameweek'; // Import the gameweek service
import { createApiRouteCookieMethods } from '../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';

// Main API handler for GET /api/gameweeks
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Validate and Parse Query Parameters ---
  let season: number | undefined;
  const seasonQueryParam = req.query.season;
  // Check if the query parameter exists and is a string before parsing
  if (typeof seasonQueryParam === 'string') {
    season = parseInt(seasonQueryParam, 10);
    // Check if parsing resulted in NaN (Not-a-Number)
    if (isNaN(season)) {
      return res.status(400).json({ error: 'Invalid season parameter. Must be a number.' });
    }
  } // season remains undefined otherwise

  let leagueId: number | undefined;
  const leagueIdQueryParam = req.query.leagueId;
  // Check if the query parameter exists and is a string before parsing
  if (typeof leagueIdQueryParam === 'string') {
    leagueId = parseInt(leagueIdQueryParam, 10);
    // Check if parsing resulted in NaN
    if (isNaN(leagueId)) {
      return res.status(400).json({ error: 'Invalid leagueId parameter. Must be a number.' });
    }
  } // leagueId remains undefined otherwise
 

  // Create a request-specific Supabase server client
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // Make sure these are set
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req, res) }
  );

  try {
    // Optional: Session check
    const { error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error('Session error in /api/gameweeks:', sessionError);
        return res.status(500).json({ error: 'Could not verify session.' });
    }
    // if (!session) return res.status(401).json({ error: 'Authentication required' });

    console.log(`Fetching gameweeks from DB via service... Filters: leagueId=${leagueId}, season=${season}`);
    // Call the service layer function with filters
    const serviceResponse = await gameweekServices.findGameweeks(supabase, {
      leagueId, // Pass potentially undefined values
      season,   // Pass potentially undefined values
    });

    // Handle potential errors from the service
    if (serviceResponse.error) {
      console.error('Service error fetching gameweeks:', serviceResponse.error);
      let statusCode = 500; // Default
      if (serviceResponse.error instanceof GameweekError) {
        switch (serviceResponse.error.code) {
          case 'NOT_FOUND':
            statusCode = 404;
            break;
          case 'VALIDATION_ERROR':
            statusCode = 400;
            break;
          case 'DATABASE_ERROR':
            statusCode = 500;
            break;
          default:
            statusCode = 500;
        }
      }
      return res.status(statusCode).json({ error: serviceResponse.error.message });
    }

    // Handle null data case (service should return [], but defensive check)
    if (serviceResponse.data === null) {
        console.log('Gameweek service returned null data.');
        return res.status(200).json([]);
    }

    // Success: Return the array of gameweeks from the database
    const gameweeksData = serviceResponse.data;
    console.log(`Successfully fetched ${gameweeksData.length} gameweeks from DB.`);
    return res.status(200).json(gameweeksData);

  } catch (error: unknown) {
    // Catch unexpected errors during the handler execution
    console.error('Unexpected error in /api/gameweeks handler:', error);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}