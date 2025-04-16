import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../../context/SupabaseContext'; 

// Define user profile interface (can be moved to a shared types file later)
export interface UserProfile {
  id: string;
  name: string | null;
  created_at?: string;
}

export function useUserProfile() {
  const { supabase, session } = useSupabase();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!session?.user) {
      setFetchLoading(false);
      setUserProfile(null);
      return;
    }
    setFetchLoading(true);
    setFetchError(null);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error(profileError.message);
      }

      setUserProfile(profile || { id: session.user.id, name: null });
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setFetchError(err instanceof Error ? err.message : 'An unknown error occurred fetching profile');
      setUserProfile(null);
    } finally {
      setFetchLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const updateProfileName = async (name: string): Promise<boolean> => {
    if (!session?.user) {
      setUpdateError('No active session found.');
      return false;
    }
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      const { error: updateDbError } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', session.user.id)
        .select()
        .single();

      if (updateDbError) {
        throw updateDbError;
      }
      console.log('Profile name updated via hook.');
      setUserProfile(prev => prev ? { ...prev, name: name.trim() } : null);
      setUpdateLoading(false);
      return true;
    } catch (err: unknown) {
      console.error('Error updating profile name via hook:', err);
      setUpdateError(err instanceof Error ? err.message : 'Failed to update profile name.');
      setUpdateLoading(false);
      return false;
    }
  };

  return {
    userProfile,
    loading: fetchLoading,
    error: fetchError,
    refetch: fetchUserProfile,

    updateProfileName,
    isUpdating: updateLoading,
    updateError,
  };
} 