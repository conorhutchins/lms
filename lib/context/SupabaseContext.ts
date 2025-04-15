import { createContext, useContext } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Make the shape of the context
export interface SupabaseContextType {
  supabase: SupabaseClient<Database>;
  session: Session | null;
  // Optional: Add loading state if needed directly in context
  // isLoading: boolean;
}

// Create a context for the Supabase client and session
export const SupabaseContext = createContext<SupabaseContextType | null>(null);

// Custom hook to use the Supabase context
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === null) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};