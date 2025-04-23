import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../../../lib/types/supabase';
import { createApiRouteCookieMethods } from '../../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import { paymentEntryServices, PaymentEntryError } from '../../../../lib/db/services/paymentEntry';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. Check if the method is POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Get Competition ID from query parameters
  const { id: competitionId } = req.query;

  if (typeof competitionId !== 'string' || !competitionId) {
    return res.status(400).json({ error: 'Invalid or missing competition ID.' });
  }

  // 3. Create Supabase client for API routes
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req, res) }
  );

  try {
    // 4. Get current user session and ID
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error in /api/competitions/[id]/enter:', sessionError);
      return res.status(500).json({ error: 'Could not verify session.' });
    }

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ error: 'Authentication required to enter competition.' });
    }

    const userId = session.user.id;

    // 5. Call the updated service function
    console.log(`User ${userId} attempting free entry via payment for competition ${competitionId}...`);
    const serviceResponse = await paymentEntryServices.enterCompetitionViaPayment(
      supabase,
      userId,
      competitionId
    );

    // 6. Handle service response (success or error)
    if (serviceResponse.error) {
      console.error('Service error creating payment entry:', serviceResponse.error);
      let statusCode = 500; // Default to internal server error
      
      // Update error handling to use PaymentEntryError and its codes
      if (serviceResponse.error instanceof PaymentEntryError) {
        switch (serviceResponse.error.code) {
          case 'VALIDATION_ERROR':
            statusCode = 400;
            break;
          case 'UNAUTHORIZED': 
            statusCode = 401;
            break;
          case 'NOT_FOUND': 
            statusCode = 404;
            break;
          case 'ALREADY_PAID_OR_ENTERED': // Use the updated error code
            statusCode = 409; // Conflict status
            break;
          case 'DATABASE_ERROR':
          default:
            statusCode = 500;
            break;
        }
      }
      return res.status(statusCode).json({ error: serviceResponse.error.message });
    }

    // 7. Return success response
    console.log(`User ${userId} successfully created payment entry for competition ${competitionId}.`);
    // Return the created payment details upon success
    return res.status(201).json(serviceResponse.data);

  } catch (error: unknown) {
    // Catch unexpected errors during the handler execution
    console.error('Unexpected error in /api/competitions/[id]/enter:', error);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
} 