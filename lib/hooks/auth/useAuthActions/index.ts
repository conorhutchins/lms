import { useState } from 'react';
import { useSupabase } from '../../../context/SupabaseContext';
import type { Provider } from '@supabase/supabase-js';

export function useAuthActions() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Helper to reset states
  const resetStates = () => {
    setError(null);
    setMessage(null);
  };

  // --- Email/Password Sign In ---
  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true);
    resetStates();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Email sign-in error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please confirm your email before logging in.');
        } else {
          setError(signInError.message);
        }
        return false; // Indicate failure
      } else {
        console.log('Login successful via hook');
        // Success is handled by session state change
        return true; // Indicate success
      }
    } catch (err: unknown) {
      console.error('Unexpected login error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      return false; // Indicate failure
    } finally {
      setLoading(false);
    }
  };

  // --- Email/Password Sign Up ---
  const signUpWithPassword = async (email: string, password: string) => {
    setLoading(true);
    resetStates();
    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Ensure this matches your auth callback route
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        }
      });

      if (signUpError) {
        console.error('Email sign-up error:', signUpError);
        if (signUpError.message.includes('email address is already registered')) {
          setError('This email is already registered. Try logging in instead.');
        } else {
          setError(signUpError.message);
        }
        return false;
      } else {
        if (data?.user && !data.session) {
          setMessage('Check your email for the confirmation link!');
        } else if (data?.session) {
          setMessage('Signup successful! Redirecting...'); // May not be needed if relying on session redirect
        } else {
          setError('Signup process initiated, but state is unclear. Please check your email or try logging in.');
        }
        return true;
      }
    } catch (err: unknown) {
      console.error('Exception during signup:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // --- OAuth Sign In (handles both sign in/sign up) ---
  const signInWithOAuth = async (provider: Provider) => {
    setLoading(true);
    resetStates();
    try {
      console.log(`Initiating ${provider} OAuth via hook...`);
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent', // Prompt for consent even if previously approved
          }
        },
      });

      if (oauthError) {
        console.error(`OAuth ${provider} error:`, oauthError);
        setError(oauthError.message);
        setLoading(false); // Stop loading on immediate error
      } else if (!data.url) {
        console.error('No redirect URL returned from signInWithOAuth');
        setError(`Could not initiate ${provider} login. Please try again.`);
        setLoading(false);
      } else {
        // Manual redirect - loading state will persist until redirect happens
        console.log('Redirecting to OAuth provider:', data.url);
        window.location.href = data.url;
        // Don't setLoading(false) here, page will navigate away
      }
    } catch (err: unknown) {
      console.error(`Unexpected error during ${provider} OAuth initiation:`, err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  // --- Sign Out ---
  const signOut = async () => {
    setLoading(true);
    resetStates();
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Sign out error:', signOutError);
        setError(signOutError.message);
        return false;
      } else {
        console.log('Signed out successfully via hook');
        // Session change handles redirect
        return true;
      }
    } catch (err: unknown) {
      console.error('Exception during sign out:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    message,
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    signOut,
    setError, // Expose setError for manual error setting if needed
    setMessage, // Expose setMessage for manual message setting if needed
  };
} 