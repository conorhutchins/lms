// lib/auth/index.test.ts - Tests for authentication functionality
import { authOptions } from './index';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Account } from 'next-auth';

// Define types for testing
interface MockSession {
  user: Partial<Session['user']> & { id?: string };
}

interface MockToken extends Partial<JWT> {
  id?: string;
}

interface MockUser {
  id: string;
  name?: string;
  email?: string;
}

describe('authOptions', () => {
  it('has Google provider configured', () => {
    expect(authOptions.providers).toHaveLength(1);
    expect(authOptions.providers[0].id).toBe('google');
  });

  it('has custom pages configured', () => {
    expect(authOptions.pages).toEqual({
      signIn: '/auth/signin',
      error: '/auth/error',
    });
  });

  it('has session callback that adds user ID to session', async () => {
    // Mock session and token with properly typed objects
    const mockSession: MockSession = { user: {} };
    const mockToken: MockToken = { id: 'user123' };

    // We have to use a type assertion here because the actual type is complex
    // This is a controlled test environment and we're testing the behavior
    const sessionParams = {
      session: mockSession as Session,
      token: mockToken,
    };
    
    // We're testing side effects on the mockSession, not the return value
    // @ts-expect-error - We know this parameter structure is incomplete for TypeScript but valid for our test
    await authOptions.callbacks!.session!(sessionParams);

    // Check that the user.id was set from the token
    expect(mockSession.user.id).toBe('user123');
  });

  it('has jwt callback that adds user info to token', async () => {
    // Mock token and user
    const mockToken: MockToken = {};
    const mockUser: MockUser = { id: 'user123' };

    // Create a minimal valid input for the JWT callback
    // In a real scenario it would have more fields but for testing this is sufficient
    const jwtParams = {
      token: mockToken,
      user: mockUser,
      account: null as Account | null,
      // Add required properties with minimal values for testing
      trigger: 'signIn' as const,
    };
    
    // Force TypeScript to accept our simplified parameters for testing purposes
    const jwtCallback = authOptions.callbacks!.jwt! as (
      params: typeof jwtParams
    ) => Promise<JWT>;
    
    const updatedToken = await jwtCallback(jwtParams);

    // Verify the ID was added
    expect(updatedToken.id).toBe('user123');
  });

  it('uses the NEXTAUTH_SECRET environment variable', async () => {
    // Store original environment
    const originalSecret = process.env.NEXTAUTH_SECRET;
    
    try {
      // Set test environment variable
      process.env.NEXTAUTH_SECRET = 'test_secret';
      
      // Re-import to get fresh config with new env var
      jest.resetModules();
      
      // Use dynamic import
      const { authOptions: freshOptions } = await import('./index');
      
      // Verify the secret is used
      expect(freshOptions.secret).toBe('test_secret');
    } finally {
      // Restore original environment
      process.env.NEXTAUTH_SECRET = originalSecret;
    }
  });
}); 