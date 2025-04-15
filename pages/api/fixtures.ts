// This file is the endpoint we call to show the fixtures on the frontend
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../lib/types/supabase'; 
import { fixtureServices, FixtureError } from '../../lib/db/services/fixtures'; 
import { createApiRouteCookieMethods } from '../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';

/* all that this is doing is fetching the fixtures from the database
it sets up a route /api/fixtures and then it gets the fixtures from the database */

// Main API handler for /api/fixtures
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a request-specific Supabase server client
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req, res) }
  );

  try {

    const { error: sessionError } = await supabase.auth.getSession(); 
    if (sessionError) {
        // Log the internal error but return a generic message
        console.error('Session error in /api/fixtures:', sessionError);
        return res.status(500).json({ error: 'Could not verify session.' });
    }

    console.log('Fetching fixtures via service...');
    // Call the service layer function, passing the request-specific client
    const serviceResponse = await fixtureServices.findAllFixtures(supabase);

    // Check if the service returned an error
    if (serviceResponse.error) {
      console.error('Service error fetching fixtures:', serviceResponse.error);
      
      // Map service error codes to appropriate HTTP status codes
      let statusCode = 500; // Default to internal server error
      if (serviceResponse.error instanceof FixtureError) { // Check if it's our specific FixtureError
        switch (serviceResponse.error.code) {
          // Add cases for NOT_FOUND or VALIDATION_ERROR if findAllFixtures could produce them
          case 'DATABASE_ERROR':
            statusCode = 500;
            break;
          default:
            statusCode = 500; // Fallback for unmapped FixtureError codes
        }
      }
      return res.status(statusCode).json({ error: serviceResponse.error.message });
    }

    // Check if data is null (findAllFixtures should return [], but handle defensively)
    if (serviceResponse.data === null) {
        console.log('Fixture service returned null data.');
        return res.status(200).json([]); // Return empty array
    }
    
    // Success: Return the array of fixtures from the service response data
    const fixturesData = serviceResponse.data;
    console.log(`Successfully fetched ${fixturesData.length} fixtures.`);
    return res.status(200).json(fixturesData);

  } catch (error: unknown) {
    // Catch unexpected errors during the handler execution
    console.error('Unexpected error in /api/fixtures handler:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while fetching fixtures.' });
  }
}