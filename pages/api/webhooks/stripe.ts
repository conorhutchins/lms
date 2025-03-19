// All this file is doing is listening for events from Stripe

import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { STRIPE_API_VERSION } from '../../../lib/stripe/constants';
// Disable the default body parser to get the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialise Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  try {
    // Verify the signature to ensure the request is coming from Stripe
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      // Verify the signature
      event = stripe.webhooks.constructEvent(rawBody.toString(), signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Webhook signature verification failed';
      console.error(`Webhook Error: ${errorMessage}`);
      return res.status(400).json({ error: `Webhook Error: ${errorMessage}` });
    }

    // Handle specific events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Process the checkout session completion
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Process delayed payment success
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Handle payment failure
        await handlePaymentFailed(session);
        break;
      }
      default: {
        console.log(`Unhandled event type: ${event.type}`);
      }
    }

    // Return a 200 success response to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    console.error(`Webhook Error: ${errorMessage}`);
    return res.status(500).json({ error: `Webhook Error: ${errorMessage}` });
  }
}

// Successful checkout handler
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Get metadata from the session
  const { userId, competitionId } = session.metadata || {};
  
  if (!userId) {
    console.error('No user ID in session metadata');
    return;
  }

  console.log(`Processing successful payment for user ${userId} in competition ${competitionId || 'default'}`);
  
  // TODO: Implement business logic here
  // For example:
  // 1. Update user's competition entry in the database
  // 2. Send confirmation email to the user
  // 3. Add user to the competition roster
}

// Failed payment handler
async function handlePaymentFailed(session: Stripe.Checkout.Session) {
  // Get metadata from the session
  const { userId, competitionId } = session.metadata || {};
  
  console.log(`Payment failed for user ${userId} in competition ${competitionId || 'default'}`);
  
  // TODO: Implement failure handling
  // For example:
  // 1. Update payment status in the database
  // 2. Send notification to the user about payment failure
  // 3. Provide retry instructions
} 