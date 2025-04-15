import { useState, useEffect } from 'react';
import { useSupabase } from '../context/SupabaseContext'; // Import the hook correctly

// Define user profile interface (can be moved to a shared types file later)
export interface UserProfile {
  id: string;
  name: string | null;
  created_at?: string;
}

export function useUserProfile() {
  const { supabase, session } = useSupabase();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      // Only fetch if there's a user session
      if (!session?.user) {
        setLoading(false); // Not loading if no user
        setUserProfile(null); // Ensure profile is null if no session
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is okay if profile is optional
          throw new Error(profileError.message);
        }

        // Set profile or a default object if profile is null but user exists
        setUserProfile(profile || { id: session.user.id, name: null });

      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred fetching profile');
        setUserProfile(null); // Clear profile on error
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  // Re-run effect if the user session changes
  }, [session, supabase]);

  return { userProfile, loading, error };
} 