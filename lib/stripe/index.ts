// This file is just the central export for all Stripe-related functionality
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe as StripeClient } from '@stripe/stripe-js';
import Stripe from 'stripe';
import createCheckoutSession from './createCheckoutSession';
import { STRIPE_API_VERSION } from './constants';

// Initialise Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

// Client side Stripe instance
let stripePromise: Promise<StripeClient | null>;

/**
 * Returns a client-side Stripe instance for use in the browser
 */
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

/**
 * Creates a Stripe customer portal session
 * 
 * @param customerId The Stripe customer ID
 * @returns A portal session for managing subscriptions and payments
 */

// Creates a Stripe customer portal session
export const createCustomerPortalSession = async (customerId: string) => {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  });

  return portalSession;
};

// Export all Stripe-related functions
export {
  createCheckoutSession,
}; 