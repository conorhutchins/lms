import { Provider } from '@supabase/supabase-js';
import { createClient } from './client';

export type AuthProvider = 'google';

export interface AuthResponse {
  success: boolean;
  error?: string;
  url?: string;
}

/**
 * Handles OAuth sign in with various providers
 */
export const handleOAuthSignIn = async (provider: AuthProvider): Promise<AuthResponse> => {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return { success: false, error: 'Authentication URL not provided' };
    }

    return { success: true, url: data.url };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'An unknown error occurred' 
    };
  }
};

/**
 * Helper function to get the current session
 */
export const getCurrentSession = async () => {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    return null;
  }
  
  return session;
};

/**
 * Helper function to sign out
 */
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}; 