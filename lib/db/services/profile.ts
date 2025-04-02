import { supabase } from '../../db';
// Import generated types
import { Database } from '../../types/supabase';

// Define helper types based on generated ones
type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileCreateData = Database['public']['Tables']['profiles']['Insert'];
// We don't need Update type yet, but could add:
// type ProfileUpdateData = Database['public']['Tables']['profiles']['Update'];

// Service object for managing user profiles
export const profileServices = {

  /**
   * Finds a user profile by their UUID (which matches auth.users.id)
   * @param id - The user's UUID string
   * @returns Profile object or null if not found or error
   */
  async findProfileById(id: string): Promise<Profile | null> {
    if (!id) return null; // Prevent query with undefined id

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id) // Query by UUID
      .single();

    if (error) {
      // Handle 'PGRST116' (Row not found) specifically if needed, otherwise log
      if (error.code !== 'PGRST116') {
         console.error('Error fetching profile by id:', error);
      }
      return null;
    }

    return data;
  },

  /**
   * Creates a new user profile. Should typically be called after
   * successful user signup via supabase.auth.signUp.
   * @param profileData - Must include 'id' (matching auth user) and any other fields like 'name'.
   * @returns The newly created profile object or null if error.
   */
  async createProfile(profileData: ProfileCreateData): Promise<Profile | null> {
    // Ensure the required 'id' field is present
    if (!profileData.id) {
        console.error('Error creating profile: Missing user ID.');
        return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    return data;
  },

  // You might add an updateProfile method here later if needed
  /*
  async updateProfile(id: string, profileData: ProfileUpdateData): Promise<Profile | null> {
     const { data, error } = await supabase
       .from('profiles')
       .update(profileData)
       .eq('id', id)
       .select()
       .single();

     if (error) {
       console.error('Error updating profile:', error);
       return null;
     }
     return data;
  }
  */

  // Note: We removed findUserByEmail as email is managed by supabase.auth
  // and createUser as user creation is handled by supabase.auth.signUp
};