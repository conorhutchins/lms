import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../lib/types/supabase';
import { gameweekServices, GameweekError } from '../lib/db/services/gameweek';
import { createApiRouteCookieMethods } from '../lib/utils/supabaseServerHelpers/supabaseServerHelpers';

// Main API handler for GET /api/gameweek
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Refactored Parameter Parsing & Validation --- 
  let season: number | undefined = undefined;
  const seasonQuery = req.query.season;
  if (seasonQuery) {
    const parsedSeason = parseInt(String(seasonQuery), 10);
    if (isNaN(parsedSeason)) {
      return res.status(400).json({ error: 'Invalid season parameter. Must be a number.' });
    }
    season = parsedSeason;
  }

  let leagueId: number | undefined = undefined;
  const leagueIdQuery = req.query.leagueId;
  if (leagueIdQuery) {
    const parsedLeagueId = parseInt(String(leagueIdQuery), 10);
    if (isNaN(parsedLeagueId)) {
      return res.status(400).json({ error: 'Invalid leagueId parameter. Must be a number.' });
    }
    leagueId = parsedLeagueId;
  }
  // --- End Refactored Block --- 

  // Restore try block
  try {
    // Create a request-specific Supabase client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, // Ensure these are set
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: createApiRouteCookieMethods(req, res) }
    );

    // Optional: Session check (kept for consistency, decide if needed for this data)
    const { error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error('Session error in /api/gameweek:', sessionError);
        return res.status(500).json({ error: 'Could not verify session.' });
    }
    // if (!session) return res.status(401).json({ error: 'Authentication required' });

    console.log('Fetching gameweeks from database via service...');
    // Call the service layer function with filters
    const serviceResponse = await gameweekServices.findGameweeks(supabase, {
      leagueId, // Use the validated variables
      season,   // Use the validated variables
    });

    // Handle potential errors from the service
    if (serviceResponse.error) {
      console.error('Service error fetching gameweeks:', serviceResponse.error);
      let statusCode = 500; // Default
      if (serviceResponse.error instanceof GameweekError) {
        switch (serviceResponse.error.code) {
          case 'NOT_FOUND': // Example if findGameweeks could return this
            statusCode = 404;
            break;
          case 'VALIDATION_ERROR': // Example
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

  // Restore catch block
  } catch (error: unknown) {
    // Catch unexpected errors during the handler execution
    console.error('Unexpected error in /api/gameweek handler:', error);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
} 