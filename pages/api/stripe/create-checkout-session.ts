// All this file is going is creating an API route endpoint for Stripe checkout session creation

import { NextApiRequest, NextApiResponse } from 'next';
import { validateRequestMethod, requireAuth } from '../../../lib/apiHelpers';
import { createCheckoutSession } from '../../../lib/stripe';

interface StripeError extends Error {
  type?: string;
  statusCode?: number;
  code?: string;
}

/**
 * API handler for creating a Stripe checkout session
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  if (!validateRequestMethod(req, res, ['POST'])) {
    return;
  }

  try {
    // Require authentication
    const session = await requireAuth(req, res);
    if (!session) return;

    // Extract competition ID from request body, if provided
    const { competitionId } = req.body;
    
    // Get user ID from session
    const userId = session.user?.email || '';
    
    // Get origin from request headers
    const origin = req.headers.origin || req.headers.referer || process.env.NEXTAUTH_URL;
    
    // Create checkout session
    const checkoutSession = await createCheckoutSession(userId, competitionId, origin);
    
    // Option 1: Return the session ID to the client (current approach)
    res.status(200).json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url // Also return the URL for direct use
    });
    
    // Option 2: Redirect directly from the server (uncomment to use)
    // if (checkoutSession.url) {
    //   res.redirect(303, checkoutSession.url);
    // } else {
    //   throw new Error('No checkout URL returned');
    // }
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    
    // Improved error handling with Stripe-specific status codes
    const stripeError = error as StripeError;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = stripeError.statusCode || 500;
    
    res.status(statusCode).json({ 
      error: {
        message: errorMessage,
        type: stripeError.type || 'api_error'
      }
    });
  }
} 