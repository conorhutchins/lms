/**
 * Tests for middleware.ts
 * Tests session handling, cookie management and error handling
 */

// Mock Next.js modules before importing
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn().mockReturnValue({
      cookies: {
        set: jest.fn(),
      },
    }),
  },
}));

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn().mockReturnValue({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
    },
  }),
}));

// Import the middleware and mocked modules
import { middleware } from '../middleware';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

describe('Middleware', () => {
  // Store original environment variables
  const originalEnv = process.env;
  
  // Mock request object with minimal required properties
  const mockRequest = {
    cookies: {
      get: jest.fn().mockReturnValue({ value: 'test-cookie-value' }),
      set: jest.fn(),
    },
    headers: new Headers(),
    nextUrl: { pathname: '/dashboard' },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup environment variables
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });
  
  afterAll(() => {
    // Restore environment variables
    process.env = originalEnv;
  });

  it('should create a response using NextResponse.next', async () => {
    // Act
    await middleware(mockRequest as any);
    
    // Assert
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('should create a Supabase server client', async () => {
    // Act
    await middleware(mockRequest as any);
    
    // Assert
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test-project.supabase.co',
      'test-anon-key',
      expect.anything()
    );
  });

  it('should refresh the session', async () => {
    // Arrange
    const mockGetSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    (createServerClient as jest.Mock).mockReturnValueOnce({
      auth: { getSession: mockGetSession },
    });
    
    // Act
    await middleware(mockRequest as any);
    
    // Assert
    expect(mockGetSession).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // Arrange
    (createServerClient as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Act
    const response = await middleware(mockRequest as any);
    
    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Middleware: Error refreshing session:',
      expect.any(Error)
    );
    expect(response).toBeDefined();
    
    // Cleanup
    consoleErrorSpy.mockRestore();
  });
});