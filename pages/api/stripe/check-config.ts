// this file is just a debugging file for checking the stripe config

import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '../../../lib/stripe/constants';
// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

/**
 * Helper API to check Stripe configuration 
 * This is for debugging purposes only and should be removed in production
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Doesn't allow this in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found in production' });
    }

    // Check Stripe configuration
    const config = {
      stripe_api_version: '2025-02-24.acacia',
      default_price_id: process.env.STRIPE_DEFAULT_PRICE_ID,
      webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
      nextauth_url: process.env.NEXTAUTH_URL,
    };

    // Validate price ID if provided
    let priceDetails = null;
    
    // check price id is valid
    if (config.default_price_id) {
      try {
        const price = await stripe.prices.retrieve(config.default_price_id);
        priceDetails = {
          id: price.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          product: price.product,
        };
      } catch (priceError) {
        priceDetails = { error: `Invalid price ID: ${(priceError as Error).message}` };
      }
    }

    return res.status(200).json({
      config,
      priceDetails,
      message: 'Configuration check complete',
    });
  } catch (error) {
    console.error('Config check error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
} 