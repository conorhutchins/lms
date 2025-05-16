// Mock stripe module
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'test_checkout_session_id',
          url: 'https://checkout.stripe.com/test'
        })
      }
    }
  }));
});

// Import the modules after mocking
import { createCheckoutSession } from './createCheckoutSession';
import Stripe from 'stripe';

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
    // Call the function
    const session = await createCheckoutSession('user123');
    
    // Basic assertion on the result
    expect(session).toEqual({
      id: 'test_checkout_session_id',
      url: 'https://checkout.stripe.com/test',
    });
  });
  
  it('creates a checkout session with competition-specific price', async () => {
    // Call with competition ID
    const session = await createCheckoutSession('user123', 'comp456');
    
    // Basic assertion on the result
    expect(session).toEqual({
      id: 'test_checkout_session_id',
      url: 'https://checkout.stripe.com/test',
    });
  });
  
  it('creates a checkout session with a custom origin', async () => {
    // Call with custom origin
    const session = await createCheckoutSession('user123', undefined, 'https://custom-origin.com');
    
    // Basic assertion on the result
    expect(session).toEqual({
      id: 'test_checkout_session_id',
      url: 'https://checkout.stripe.com/test',
    });
  });
  
  it('throws an error if price ID is not configured', async () => {
    // Remove price IDs from environment
    delete process.env.STRIPE_DEFAULT_PRICE_ID;
    delete process.env.STRIPE_COMPETITION_PRICE_ID;
    
    // Should throw an error
    await expect(createCheckoutSession('user123')).rejects.toThrow(
      'Stripe price ID not configured'
    );
  });
  
  it('throws an error if no base URL is provided', async () => {
    // Remove NEXTAUTH_URL from environment
    delete process.env.NEXTAUTH_URL;
    
    // Should throw an error
    await expect(createCheckoutSession('user123')).rejects.toThrow(
      'No base URL provided for redirects'
    );
  });
});