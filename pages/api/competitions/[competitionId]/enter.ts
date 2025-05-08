// API endpoint for entering a user into a competition

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../../../lib/types/supabase';
import { createApiRouteCookieMethods } from '../../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import { paymentEntryServices, PaymentEntryError, PaymentEntryErrorCode } from '../../../../lib/db/services/paymentEntry';
import { competitionServices, CompetitionError } from '../../../../lib/db/services/competition';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // grab competition ID from query params
  const { competitionId } = req.query;

  // ensure competition ID is a string and not empty
  if (typeof competitionId !== 'string' || !competitionId) {
    return res.status(400).json({ error: 'Invalid or missing competition ID.' });
  }

  // create Supabase client for API routes
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req, res) } // pass in cookies from the request
  );

  try {
    // Grab the current user session and ID
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error in /api/competitions/[id]/enter:', sessionError);
      return res.status(500).json({ error: 'Could not verify session.' });
    }

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ error: 'Authentication required to enter competition.' });
    }

    // grab the user ID from the session
    const userId = session.user.id;

    // Use the service to get the competition entry requirements
    const entryRequirementResponse = await competitionServices.checkIfCompetitionEntryRequiresPayment(supabase, competitionId);

    if (entryRequirementResponse.error) {
      console.error('Error fetching competition entry requirement details from service:', entryRequirementResponse.error);
      if (entryRequirementResponse.error instanceof CompetitionError && entryRequirementResponse.error.code === 'NOT_FOUND') {
        return res.status(404).json({ error: entryRequirementResponse.error.message });
      }
      return res.status(500).json({ error: 'Failed to retrieve competition entry requirement details.' });
    }

    if (!entryRequirementResponse.data) {
        console.error('Competition entry requirement service returned no data and no error.');
        return res.status(500).json({ error: 'Failed to retrieve competition entry requirement details (unexpected state).' });
    }

    const { entryFee, paymentType } = entryRequirementResponse.data;
    
    // Call the service function to enter the competition
    console.log(`User ${userId} attempting ${paymentType} for competition ${competitionId}...`);
    const serviceResponse = await paymentEntryServices.enterCompetitionViaPayment(
      supabase,
      userId,
      competitionId,
      entryFee,
      paymentType 
    );

    // handle errors
    if (serviceResponse.error) {
      console.error('Service error creating payment entry:', serviceResponse.error);
      let statusCode = 500; // Default to internal server error
      
      // Update error handling to use PaymentEntryError and its codes
      if (serviceResponse.error instanceof PaymentEntryError) {
        const errorCode = serviceResponse.error.code as PaymentEntryErrorCode;
        switch (errorCode) {
          case 'VALIDATION_ERROR':
            statusCode = 400;
            break;
          case 'UNAUTHORIZED': 
            statusCode = 401;
            break;
          case 'NOT_FOUND': 
            statusCode = 404;
            break;
          case 'ALREADY_PAID_OR_ENTERED':
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

    // handle payment redirect for paid competition entries
    if (paymentType === 'paid_entry') {
      // Return payment data with redirect URL for frontend to handle
      return res.status(200).json({
        payment_required: true,
        payment_data: serviceResponse.data,
        checkout_url: `/checkout/${competitionId}` // Frontend will redirect here can adjust later
      });
    }

    // return success response for free entries
    console.log(`User ${userId} successfully created payment entry for competition ${competitionId}.`);
    return res.status(201).json(serviceResponse.data);

  } catch (error: unknown) {
    // Log updated path
    console.error(`Unexpected error in /api/competitions/[competitionId]/enter:`, error);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
} 