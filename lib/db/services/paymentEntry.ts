// quick file to handle the payment entry process for competitions it creates payment records in the payments table 

import { Database } from '../../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, type ServiceResponse, type ServiceErrorCode } from '../../types/service';

// Define helper types based on the payments table
type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentEntryErrorCode = ServiceErrorCode | 'ALREADY_PAID_OR_ENTERED'; // create type for the possible payment error codes by extending the base

// custom error class for payment entry errors using above type
export class PaymentEntryError extends ServiceError {
  constructor(
    message: string,
    code: PaymentEntryErrorCode,
    originalError?: unknown
  ) {
    super(message, code as ServiceErrorCode, originalError);
    this.name = 'PaymentEntryError';
  }
}

// Main service object for handling payment entry process
export const paymentEntryServices = {
// enter competition via payment
  async enterCompetitionViaPayment(
    supabase: SupabaseClient<Database>,
    userId: string,
    competitionId: string,
    entryFee: number,
    paymentType: 'free_entry' | 'paid_entry'
  ): Promise<ServiceResponse<Payment, PaymentEntryError>> {
    try {
      // quick validation
      if (!userId) {
        throw new PaymentEntryError('User ID is required.', 'VALIDATION_ERROR');
      }
      if (!competitionId) {
        throw new PaymentEntryError('Competition ID is required.', 'VALIDATION_ERROR');
      }
      // immediately check if the entry is free
      const isFreeEntry = paymentType === 'free_entry';

      // create a payment record
      const paymentData: PaymentInsert = {
        user_id: userId,
        competition_id: competitionId,
        amount: isFreeEntry ? 0 : entryFee, 
        payment_status: isFreeEntry ? 'completed' : 'pending',
        payment_type: isFreeEntry ? 'free_entry' : 'paid_entry',
        // Other nullable fields to come (free_hit_round_id, free_hit_used, etc.) all can default to null
      };

      // insert the payment record
      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single(); // Return the newly created payment row

      // handle errors
      if (error) {
        // Log the detailed error object from Supabase
        console.error("Supabase insert error details:", error);

        // handle duplicate entry
        if (error.code === '23505') {  // just the postgres error code for duplicate entry
           throw new PaymentEntryError(
            'User has already paid or entered this competition.',
            'ALREADY_PAID_OR_ENTERED',
            error
          );
        }
        // invalid user or competition
        if (error.code === '23503') {
           throw new PaymentEntryError(
            'Competition or User not found.',
            'NOT_FOUND',
            error
          );
        }
        // handle other errors
        throw new PaymentEntryError(
          'Failed to record competition entry payment.',
          'DATABASE_ERROR',
          error // Pass the original Supabase error object
        );
      }

      // handle no data returned
      if (!data) {
          throw new PaymentEntryError(
              'Failed to retrieve payment data after insert.',
              'DATABASE_ERROR'
          );
      }
      
      return { data, error: null };

    } catch (err) {
      // handle our payment entry errors
      if (err instanceof PaymentEntryError) {
        // Log the original error if it exists within PaymentEntryError
        if (err.originalError) {
          console.error("Original DB error causing PaymentEntryError:", err.originalError);
        }
        return { data: null, error: err };
      }
      // Log other unexpected errors during the try block execution
      console.error("Unexpected error in enterCompetitionViaPayment try block:", err); 
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

// method to check if user has entered a competition
  async checkUserEntryViaPayment(
    supabase: SupabaseClient<Database>,
    userId: string,
    competitionId: string
  ): Promise<ServiceResponse<{ isEntered: boolean }, PaymentEntryError>> {
    try {
      // quick validation
      if (!userId) {
        throw new PaymentEntryError('User ID is required.', 'VALIDATION_ERROR');
      }
      if (!competitionId) {
        throw new PaymentEntryError('Competition ID is required.', 'VALIDATION_ERROR');
      }

      // grab the count of payments for the user and competition
      const { error, count } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true }) // Efficiently check existence
        .eq('user_id', userId)
        .eq('competition_id', competitionId)
        // Optional: Add conditions like .eq('payment_status', 'completed') if needed

      // handle errors
      if (error) {
        if (error.code !== 'PGRST116') { // ignore no rows error from postgres as that is expected 
            throw new PaymentEntryError(
            'Failed to check competition entry status via payments.',
            'DATABASE_ERROR',
            error
            );
        }
      }

      // return the result
      const isEntered = count !== null && count > 0;
      return { data: { isEntered }, error: null };

    } catch (err) {
      // handle our payment entry errors
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