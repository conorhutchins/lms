// This file is a service file for interacting with the profiles data in Supabase

// 1. findProfileById - find a profile by their id
// 2. createProfile - create a new profile
// 3. updateProfile - update an existing profile

import { Database } from '../../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, type ServiceResponse } from '../../types/service';

// Make helper types based on generated ones given by supabase schema
type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileCreateData = Database['public']['Tables']['profiles']['Insert'];

// When we need to update a profile we might want to do something like this
// type ProfileUpdateData = Database['public']['Tables']['profiles']['Update'];

// Make ProfileErrors by extending the basic ServiceError coming from service.ts
export class ProfileError extends ServiceError {
  constructor(
    message: string,
    code: 'NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'ProfileError';
  }
}

// Service object that contains all the methods for the profile service
export const profileServices = {

  // Finds a user profile by their UUID
  async findProfileById(
    supabase: SupabaseClient<Database>, // take in the supabase client and the id of the profile we want to find
    id: string
  ): Promise<ServiceResponse<Profile, ProfileError>> {
    try {
      if (!id) { // if the id is not provided throw an error
        throw new ProfileError(
          'User ID is required',
          'VALIDATION_ERROR'
        );
      }

      const { data, error } = await supabase // use the supabase client to query the profiles table
        .from('profiles') // from the profiles table
        .select('*') // select all columns
        .eq('id', id) // where the id matches the id passed in
        .single(); // return a single row

      if (error) {
        // Handle 'not found' case separately
        if (error.code === 'PGRST116') {
          throw new ProfileError(
            `Profile with ID ${id} not found`,
            'NOT_FOUND',
            error
          );
        }
        throw new ProfileError(
          'Failed to fetch profile',
          'DATABASE_ERROR',
          error
        );
      }

      return { data, error: null };
    } catch (err) {
      if (err instanceof ProfileError) {
        return { data: null, error: err };
      }
      return {
        data: null,
        error: new ProfileError(
          'An unexpected error occurred while fetching profile',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },

  // Creates a new user profile
  async createProfile(
    supabase: SupabaseClient<Database>, 
    profileData: ProfileCreateData
  ): Promise<ServiceResponse<Profile, ProfileError>> {
    try {
      // make sure the id is provided
      if (!profileData.id) { 
        throw new ProfileError(
          'User ID is required to create a profile',
          'VALIDATION_ERROR'
        );
      }

      const { data, error } = await supabase // use the supabase client to insert the profile data into the profiles table
        .from('profiles') // from the profiles table
        .insert([profileData]) // insert the profile data
        .select() // select all columns
        .single(); // return a single row

      if (error) {
        throw new ProfileError(
          'Failed to create profile',
          'DATABASE_ERROR',
          error
        );
      }

      return { data, error: null };
    } catch (err) {
      if (err instanceof ProfileError) {
        return { data: null, error: err };
      }
      return {
        data: null,
        error: new ProfileError(
          'An unexpected error occurred while creating profile',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },

  // Update an existing user profile
  async updateProfile(
    supabase: SupabaseClient<Database>,
    id: string,
    profileData: Partial<Profile>
  ): Promise<ServiceResponse<Profile, ProfileError>> {
    try {
      // make sure we're given the id of the profile we want to update
      if (!id) {
        throw new ProfileError(
          'User ID is required to update a profile',
          'VALIDATION_ERROR'
        );
      }

      const { data, error } = await supabase // use the supabase client to update the profile data in the profiles table
        .from('profiles') // from the profiles table
        .update(profileData) // update the profile data
        .eq('id', id) // where the id matches the id passed in
        .select() // select all columns
        .single(); // return a single row

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ProfileError(
            `Profile with ID ${id} not found`,
            'NOT_FOUND',
            error
          );
        }
        throw new ProfileError(
          'Failed to update profile',
          'DATABASE_ERROR',
          error
        );
      }

      return { data, error: null };
    } catch (err) {
      if (err instanceof ProfileError) {
        return { data: null, error: err };
      }
      return {
        data: null,
        error: new ProfileError(
          'An unexpected error occurred while updating profile',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },

  // Note: We removed findUserByEmail as email is managed by supabase.auth
  // and createUser as user creation is handled by supabase.auth.signUp
};