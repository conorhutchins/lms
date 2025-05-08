// Simple API endpoint to check if a user is entered into a competition
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../../../lib/types/supabase';
import { createApiRouteCookieMethods } from '../../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import { paymentEntryServices, PaymentEntryError } from '../../../../lib/db/services/paymentEntry';

// Create the type for a sucessful response
type EntryStatusResponse = {
  isEntered: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EntryStatusResponse | { error: string }>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Take competitionId from the query params
  const { competitionId } = req.query;

  // Ensure competitionId is a string and not empty
  if (typeof competitionId !== 'string' || !competitionId) {
    return res.status(400).json({ error: 'Invalid or missing competition ID.' });
  }

  // Create a supabase client for API routes and feed in cookies from req
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req, res) }
  );

  try {
    // grab the current user session and ID
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    // handle session errors
    if (sessionError) {
      console.error('Session error in /api/competitions/[id]/entry-status:', sessionError);
      return res.status(500).json({ error: 'Could not verify session.' });
    }

    // If no session, the user is definitely not entered (or cannot be checked)
    if (!session || !session.user || !session.user.id) {
      // Respond indicating the user is not entered / not logged in to be able to check
      return res.status(200).json({ isEntered: false }); 
    }

    // grab the user ID from the session
    const userId = session.user.id;

    // Call the service function to check entry status
    console.log(`Checking entry status for user ${userId} in competition ${competitionId}...`);
    const serviceResponse = await paymentEntryServices.checkUserEntryViaPayment(
      supabase,
      userId,
      competitionId
    );

    // Handle service response
    if (serviceResponse.error) {
      console.error('Service error checking entry status:', serviceResponse.error);
      // Don't expose internal details, map to a generic error for the client
      const statusCode = 500; 
      if (serviceResponse.error instanceof PaymentEntryError) {
      // no specific status code override for this error
      }
      // Return a generic server error message, including isEntered: false
      return res.status(statusCode).json({ 
        error: 'Failed to check competition entry status.', 
        isEntered: false 
      });
    }

    // Return success response with the entry status
    // Start by checking if the data is null
    if (serviceResponse.data === null) {
        console.error('Service checkUserEntryViaPayment returned null data unexpectedly.');
        return res.status(500).json({ error: 'Failed to retrieve entry status.'});
    }
    
    console.log(`User ${userId} entry status for competition ${competitionId}: ${serviceResponse.data.isEntered}`);
    // Return the entry status
    return res.status(200).json({ isEntered: serviceResponse.data.isEntered });

  } catch (error: unknown) {
    // Catch unexpected errors during the handler execution
    console.error('Unexpected error in /api/competitions/[id]/entry-status:', error);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
} 