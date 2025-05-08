// util function to check if a user has joined a competition
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import { paymentEntryServices } from '../../db/services/paymentEntry';


export async function ensureUserHasJoinedCompetition(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitionId: string
): Promise<boolean> {
  const { data, error } = await paymentEntryServices.checkUserEntryViaPayment(
    supabase, userId, competitionId
  );
  
  if (error) {
    console.error('Error checking competition entry:', error);
    return false;
  }
  
  return data?.isEntered || false;
}