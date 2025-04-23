import { Database } from '../../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, type ServiceResponse } from '../../types/service';

// Define helper types based on the payments table
type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

// Extend base ServiceError for payment entry-specific errors
export class PaymentEntryError extends ServiceError {
  constructor(
    message: string,
    // Refined error codes based on payment context
    code: 'ALREADY_PAID_OR_ENTERED' | 'NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR' | 'UNAUTHORIZED',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'PaymentEntryError';
  }
}

// Service object for handling competition entry via payments table
export const paymentEntryServices = {

  /**
   * Records a user's free entry into a competition by creating a payment record.
   * Assumes free entry for now, sets amount=0, status='completed', type='free_entry'.
   * @param supabase Supabase client instance.
   * @param userId The UUID of the user entering.
   * @param competitionId The UUID of the competition being entered.
   * @returns ServiceResponse containing the created payment record or an error.
   */
  async enterCompetitionViaPayment(
    supabase: SupabaseClient<Database>,
    userId: string,
    competitionId: string
  ): Promise<ServiceResponse<Payment, PaymentEntryError>> {
    try {
      // 1. Validation
      if (!userId) {
        throw new PaymentEntryError('User ID is required.', 'VALIDATION_ERROR');
      }
      if (!competitionId) {
        throw new PaymentEntryError('Competition ID is required.', 'VALIDATION_ERROR');
      }

      // 2. Perform Insert (Check if already entered first? Optional, depends on desired UX/constraints)
      // For now, we rely on potential DB constraints or let duplicates happen if no constraint exists.
      const paymentData: PaymentInsert = {
        user_id: userId,
        competition_id: competitionId,
        amount: 0, // Free entry
        payment_status: 'completed', // Assuming free entry is automatically completed
        payment_type: 'free_entry', // Specific type for this action
        // Other nullable fields (free_hit_round_id, free_hit_used, etc.) default to null
      };

      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single(); // Return the newly created payment row

      // 3. Handle Errors
      if (error) {
        // Check for unique constraint violation (if one exists on user_id, competition_id)
        // The specific error code might vary based on constraint name/type
        if (error.code === '23505') { // Example: PostgreSQL unique violation code
           throw new PaymentEntryError(
            'User has already paid or entered this competition.',
            'ALREADY_PAID_OR_ENTERED',
            error
          );
        }
        // Check for foreign key violation (e.g., competition or user doesn't exist)
        if (error.code === '23503') {
           throw new PaymentEntryError(
            'Competition or User not found.',
            'NOT_FOUND',
            error
          );
        }
        // Generic database error
        throw new PaymentEntryError(
          'Failed to record competition entry payment.',
          'DATABASE_ERROR',
          error
        );
      }

      // 4. Return Success
      if (!data) {
          throw new PaymentEntryError(
              'Failed to retrieve payment data after insert.',
              'DATABASE_ERROR'
          );
      }
      
      return { data, error: null };

    } catch (err) {
      // Catch specific PaymentEntryError or wrap unexpected errors
      if (err instanceof PaymentEntryError) {
        return { data: null, error: err };
      }
      console.error("Unexpected error in enterCompetitionViaPayment:", err); 
      return {
        data: null,
        error: new PaymentEntryError(
          'An unexpected error occurred while processing the entry.',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },

  /**
   * Checks if a specific user has an entry/payment record for a specific competition.
   * @param supabase Supabase client instance.
   * @param userId The UUID of the user.
   * @param competitionId The UUID of the competition.
   * @returns ServiceResponse containing a boolean indicating entry status or an error.
   */
  async checkUserEntryViaPayment(
    supabase: SupabaseClient<Database>,
    userId: string,
    competitionId: string
  ): Promise<ServiceResponse<{ isEntered: boolean }, PaymentEntryError>> {
    try {
      // 1. Validation
      if (!userId) {
        throw new PaymentEntryError('User ID is required.', 'VALIDATION_ERROR');
      }
      if (!competitionId) {
        throw new PaymentEntryError('Competition ID is required.', 'VALIDATION_ERROR');
      }

      // 2. Perform Select
      // Checks if *any* payment record exists for this user & competition
      const { error, count } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true }) // Efficiently check existence
        .eq('user_id', userId)
        .eq('competition_id', competitionId)
        // Optional: Add conditions like .eq('payment_status', 'completed') if needed

      // 3. Handle Errors
      if (error) {
        // Don't treat 'PGRST116' (0 rows) as an error for this check
        if (error.code !== 'PGRST116') {
            throw new PaymentEntryError(
            'Failed to check competition entry status via payments.',
            'DATABASE_ERROR',
            error
            );
        }
      }

      // 4. Return Result
      const isEntered = count !== null && count > 0;
      return { data: { isEntered }, error: null };

    } catch (err) {
      // Catch specific PaymentEntryError or wrap unexpected errors
      if (err instanceof PaymentEntryError) {
        return { data: null, error: err };
      }
      console.error("Unexpected error in checkUserEntryViaPayment:", err);
      return {
        data: null,
        error: new PaymentEntryError(
          'An unexpected error occurred while checking entry status.',
          'DATABASE_ERROR',
          err
        )
      };
    }
  },
}; 