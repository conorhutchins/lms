// lib/stripe/createCheckoutSession.test.ts - Tests for the Stripe checkout session creation
import { createCheckoutSession } from './createCheckoutSession';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'test_checkout_session_id',
            url: 'https://checkout.stripe.com/test',
          }),
        },
      },
    };
  });
});

describe('createCheckoutSession', () => {
  // Store original environment
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup test environment variables
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'test_stripe_secret',
      STRIPE_DEFAULT_PRICE_ID: 'price_default',
      STRIPE_COMPETITION_PRICE_ID: 'price_competition',
      NEXTAUTH_URL: 'https://example.com',
    };
  });
  
  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  it('creates a checkout session with default price', async () => {
    const session = await createCheckoutSession('user123');
    
    // Get the mocked Stripe instance
    const stripeInstance = (Stripe as jest.Mock).mock.results[0].value;
    
    // Verify Stripe was initialised correctly
    expect(Stripe).toHaveBeenCalledWith('test_stripe_secret', {
      apiVersion: '2023-10-16',
    });
    
    // Verify the checkout session was created with correct parameters
    expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_default',
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/dashboard?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/dashboard',
      metadata: {
        userId: 'user123',
        competitionId: 'default',
      },
    });
    
    // Verify the session is returned
    expect(session).toEqual({
      id: 'test_checkout_session_id',
      url: 'https://checkout.stripe.com/test',
    });
  });
  
  it('creates a checkout session with competition-specific price', async () => {
    await createCheckoutSession('user123', 'comp456');
    
    // Get the mocked Stripe instance
    const stripeInstance = (Stripe as jest.Mock).mock.results[0].value;
    
    // Verify the correct price ID was used
    expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          {
            price: 'price_competition',
            quantity: 1,
          },
        ],
        metadata: {
          userId: 'user123',
          competitionId: 'comp456',
        },
      })
    );
  });
  
  it('throws an error if price ID is not configured', async () => {
    // Remove price IDs from environment
    delete process.env.STRIPE_DEFAULT_PRICE_ID;
    delete process.env.STRIPE_COMPETITION_PRICE_ID;
    
    await expect(createCheckoutSession('user123')).rejects.toThrow(
      'Stripe price ID not configured'
    );
  });
}); 