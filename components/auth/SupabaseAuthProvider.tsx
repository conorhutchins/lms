'use client'; // This directive marks the component as a Client Component

// this the centre of client side auth in the app
import { useState, useEffect, ReactNode } from 'react';
import { createClient } from '../../src/lib/supabase/client'; 
import type { Session } from '@supabase/supabase-js';
import type { Database } from '../../lib/types/supabase'; 
import { SupabaseContext } from '../../lib/context/SupabaseContext';

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  // Use the createClient helper, passing the Database generic
  const [supabaseClient] = useState(() => createClient<Database>());
  // Quick state for session management
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // For loading UI transition

  useEffect(() => {
    setIsMounted(true); // Mark as mounted on client

    // Fetch initial session
    const fetchSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
        console.log('Initial session fetch:', currentSession ? 'Has session' : 'No session');
        setSession(currentSession);
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event, 'Session:', currentSession ? 'Present' : 'None');
        setSession(currentSession);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [supabaseClient]);

  // Render loading UI while fetching initial session
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        {isMounted ? (
          <div className="text-white text-center">
            <div className="w-10 h-10 border-4 border-t-purple-500 border-white rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        ) : (
          <p className="text-white">Loading...</p> // Simple text for SSR/initial render
        )}
      </div>
    );
  }

  // Once loaded, provide the context and render children
  return (
    <SupabaseContext.Provider value={{ supabase: supabaseClient, session }}>
      {children}
    </SupabaseContext.Provider>
  );
}