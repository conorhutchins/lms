// the only thing this file does is handle core business logic & create a stripe checkout session for the user to join the competition
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from './constants';

// Initialise Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

/**
 * Creates a Stripe checkout session for a user to join the competition
 * 
 * @param userId The unique identifier for the user
 * @param competitionId Optional competition ID if joining a specific competition
 * @param origin Optional origin URL for dynamic success/cancel URLs
 * @returns A Stripe checkout session object
 */
export async function createCheckoutSession(userId: string, competitionId?: string, origin?: string) {
  // Determine which price to use based on competition

  // Determine which price to use (default or competition-specific)
  // For test-competition, use a hardcoded price or default price
  let priceId;
  
  if (competitionId === 'test-competition') {
    // This is the test competition - use the default price ID
    priceId = process.env.STRIPE_DEFAULT_PRICE_ID;

  } else if (competitionId && process.env.STRIPE_COMPETITION_PRICE_ID) {
    // Real competition with specific price
    priceId = process.env.STRIPE_COMPETITION_PRICE_ID;

  } else {
    // Fallback to default price
    priceId = process.env.STRIPE_DEFAULT_PRICE_ID;

  }
    
  if (!priceId) {

    throw new Error('Stripe price ID not configured');
  }

  // Use origin if provided, otherwise fall back to NEXTAUTH_URL
  const baseUrl = origin || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error('No base URL provided for redirects');
  }

  // Create the checkout session with Stripe
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard?canceled=true`,
    metadata: {
      userId,
      competitionId: competitionId || 'default',
    },
    // Enable automatic tax calculation if configured
    automatic_tax: {
      enabled: process.env.STRIPE_ENABLE_AUTOMATIC_TAX === 'true',
    },
  });

  return checkoutSession;
}

export default createCheckoutSession;