// All this file is handling GET requests to fetch all active competitions from the database
import type { NextApiRequest, NextApiResponse } from 'next';
import { competitionServices, CompetitionError } from '../../../lib/db/services/competitionService/competition'; // pull in service and specific error type
import { createServerClient } from '@supabase/ssr'; // Use createServerClient for API routes, import parse/serialize
import { Database } from '../../../lib/types/supabase'; // Import the correct Database type
import { createApiRouteCookieMethods } from '../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';

// Main function for GET all active competitions
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
     res.setHeader('Allow', ['GET']);
     return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a request-specific Supabase sever client using the required cookie methods
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // Make sure these are set
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req, res) } // Pass the methods directly
  );

  try {
    // Optional: Check session if needed (kept for potential future use)
    // If you uncomment this, make sure to handle the session variable below
    const { error: sessionError } = await supabase.auth.getSession(); 
    if (sessionError) {
        // Don't expose internal session errors directly, log them
        console.error('Session error in /api/competitions:', sessionError);
        return res.status(500).json({ error: 'Could not verify session.' });
    }
    // Example: if session IS required
    // const { data: { session } } = await supabase.auth.getSession(); 
    // if (!session) {
    //    return res.status(401).json({ error: 'Authentication required' });
    // }

    console.log('Fetching active competitions via service...');
    // Pass the request-specific client to the service method
    const serviceResponse = await competitionServices.findActiveCompetitions(supabase);

    // Check if the service returned an error
    if (serviceResponse.error) {
      console.error('Service error fetching competitions:', serviceResponse.error);
      
      // More specific status code mapping based on CompetitionError codes
      let statusCode = 500; // Default to internal server error
      if (serviceResponse.error instanceof CompetitionError) {
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
          // Add other cases if CompetitionError defines more codes
          default:
            statusCode = 500; // Fallback for unmapped CompetitionError codes
        }
      } // Could add else if for other ServiceError types if needed
      
      return res.status(statusCode).json({ error: serviceResponse.error.message });
    }

    // Check if data is null (though findActive should return [], handle defensively)
    if (serviceResponse.data === null) {
        console.log('No active competitions found or data was null.');
        return res.status(200).json([]); // Return empty array if data is null
    }
    
    // Access the data property for the actual competitions array
    const competitionsData = serviceResponse.data;
    console.log(`Successfully fetched ${competitionsData.length} competitions.`);
    return res.status(200).json(competitionsData); // Return only the data array

  } catch (error: unknown) {
    // Catch unexpected errors during the handler execution
    console.error('Unexpected error fetching competitions:', error);
    // Don't expose raw error messages in production if possible
    return res.status(500).json({ error: 'An unexpected error occurred while fetching competitions.' });
  }
} 