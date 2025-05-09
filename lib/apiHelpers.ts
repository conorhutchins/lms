// All this file does is provider helper functions for the api routes

import Stripe from 'stripe';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/index';
import { NextApiRequest, NextApiResponse } from 'next';
import { STRIPE_API_VERSION } from './stripe/constants';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

// This function checks if the user is authenticated
export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  
  return session;
}

// This function handles errors
export async function handleApiError(error: Error | unknown, res: NextApiResponse) {
  console.error(error);
  
  if (error instanceof Stripe.errors.StripeError) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
  
  return res.status(500).json({ error: 'Internal server error' });
}

// This function validates the request method
export function validateRequestMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedMethods: string[]
) {
  if (!allowedMethods.includes(req.method!)) {
    res.setHeader('Allow', allowedMethods);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return false;
  }
  return true;
} 