import { GetServerSideProps } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../types/supabase';
import { createApiRouteCookieMethods } from '../utils/supabaseServerHelpers/supabaseServerHelpers';
import { roundServices, RoundWithCompetitionAndFixtures, RoundError } from '../db/services/roundService';
import { pickServices } from '../db/services/pickService';
import { paymentEntryServices } from '../db/services/paymentEntry';
import { NextApiRequest, NextApiResponse } from 'next';
import { Pick } from '../types/pick';
import type { SupabaseClient } from '@supabase/supabase-js';

// Define types for our data structures
type RoundBasic = {
  id: string;
  round_number: number;
  deadline_date: string;
  competition_id: string;
};

type RoundWithPick = RoundBasic & {
  existingPick: Pick | null;
  is_past: boolean;
};

// Extend the props type to include all rounds data
export type MakePicksPageProps = {
  initialRoundData?: RoundWithCompetitionAndFixtures;
  existingPick?: Pick | null;
  upcomingRounds?: Array<RoundWithPick>;
  isEntered: boolean;
  error?: string;
};

// Helper to check authentication and get user ID
async function getUserFromSession(supabase: SupabaseClient<Database>) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return { error: 'No active session', userId: null };
  }
  
  return { userId: session.user.id, error: null };
}

// Helper to check if user has entered the competition
async function checkCompetitionEntry(supabase: SupabaseClient<Database>, userId: string, competitionId: string) {
  const entryStatusResponse = await paymentEntryServices.checkUserEntryViaPayment(
    supabase, 
    userId, 
    competitionId
  );
  
  return entryStatusResponse;
}

// Helper to fetch round details
async function fetchRoundDetails(supabase: SupabaseClient<Database>, roundId: string) {
  return await roundServices.findRoundWithFixtures(supabase, roundId);
}

// Helper to check if gameweek is finished
async function checkGameweekStatus(supabase: SupabaseClient<Database>, gameweekId: string | null) {
  if (!gameweekId) return { data: null, error: 'No gameweek ID provided' };
  
  const { data, error } = await supabase
    .from('gameweeks')
    .select('finished, deadline_time')
    .eq('id', gameweekId)
    .single();
    
  return { data, error };
}

// Helper to fetch user's pick for a round
async function fetchUserPick(supabase: SupabaseClient<Database>, userId: string, roundId: string) {
  return await pickServices.findUserPickForRound(supabase, userId, roundId);
}

// Helper to fetch past and upcoming rounds
async function fetchPastAndUpcomingRounds(supabase: SupabaseClient<Database>, competitionId: string, currentRoundId: string, userId: string) {
  const now = new Date();
  
  // Fetch past rounds
  const { data: pastRounds, error: pastRoundsError } = await supabase
    .from('rounds')
    .select(`id, round_number, deadline_date, competition_id`)
    .eq('competition_id', competitionId)
    .lt('deadline_date', now.toISOString())
    .order('deadline_date', { ascending: true });

  // Fetch upcoming rounds
  const { data: upcomingRounds, error: upcomingRoundsError } = await supabase
    .from('rounds')
    .select(`id, round_number, deadline_date, competition_id`)
    .eq('competition_id', competitionId)
    .gt('deadline_date', now.toISOString())
    .order('deadline_date', { ascending: true });

  // Function to fetch existing picks for rounds
  async function fetchPicksForRounds(rounds: RoundBasic[], isPast: boolean): Promise<RoundWithPick[]> {
    if (!rounds || rounds.length === 0) return [];
    
    return await Promise.all(rounds.map(async (round) => {
      const { data: pick } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', userId)
        .eq('round_id', round.id)
        .maybeSingle();

      return {
        ...round,
        existingPick: pick || null,
        is_past: isPast
      };
    }));
  }

  let pastRoundsWithPicks: RoundWithPick[] = [];
  let upcomingRoundsWithPicks: RoundWithPick[] = [];
  
  if (pastRounds && pastRounds.length > 0) {
    pastRoundsWithPicks = await fetchPicksForRounds(pastRounds, true);
  }
  
  if (upcomingRounds && upcomingRounds.length > 0) {
    upcomingRoundsWithPicks = await fetchPicksForRounds(upcomingRounds, false);
  }

  // Combine and filter out current round
  const otherRounds = [
    ...pastRoundsWithPicks.filter(r => r.id !== currentRoundId),
    ...upcomingRoundsWithPicks.filter(r => r.id !== currentRoundId)
  ];

  return {
    otherRounds,
    errors: {
      pastRoundsError,
      upcomingRoundsError
    }
  };
}

// Main getServerSideProps function
export const getPicksPageServerSideProps: GetServerSideProps<MakePicksPageProps> = async (context) => {
  const { competitionId, roundId } = context.params || {};
  const { req, res } = context;

  if (typeof competitionId !== 'string' || typeof roundId !== 'string') {
    return { props: { error: 'Invalid competition or round ID.', isEntered: false } };
  }

  // Create Supabase client
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req as NextApiRequest, res as NextApiResponse) }
  );

  try {
    // 1. Check user session
    const { userId, error: userError } = await getUserFromSession(supabase);
    if (userError || !userId) {
      return { redirect: { destination: '/auth/signin', permanent: false } };
    }

    // 2. Check if user has entered the competition
    const entryStatusResponse = await checkCompetitionEntry(supabase, userId, competitionId);
    if (entryStatusResponse.error || !entryStatusResponse.data?.isEntered) {
      return {
        redirect: { 
          destination: `/competitions/${competitionId}?error=not_entered`, 
          permanent: false 
        }
      };
    }

    // 3. Fetch Round Details
    const roundResponse = await fetchRoundDetails(supabase, roundId);
    if (roundResponse.error) {
      let errorMessage = 'Failed to load round details.';
      if (roundResponse.error instanceof RoundError) {
        if (roundResponse.error.code === 'NOT_FOUND') return { notFound: true };
        errorMessage = roundResponse.error.message;
      }
      return { props: { error: errorMessage, isEntered: true } };
    }
    
    if (!roundResponse.data) {
      return { props: { error: 'Failed to load round data.', isEntered: true } };
    }

    // 3.5 Check if the gameweek is finished
    const { data: gameweekData } = await checkGameweekStatus(supabase, roundResponse.data.gameweek_id);
    if (gameweekData?.finished) {
      return {
        redirect: {
          destination: `/competitions/${competitionId}?error=round_finished`,
          permanent: false
        }
      };
    }

    // Check if deadline has passed
    if (gameweekData?.deadline_time && new Date(gameweekData.deadline_time) < new Date()) {
      return {
        redirect: {
          destination: `/competitions/${competitionId}?error=deadline_passed`,
          permanent: false
        }
      };
    }

    // 4. Fetch Existing Pick
    const pickResponse = await fetchUserPick(supabase, userId, roundId);
    const existingPick = pickResponse.data;

    // 5. Fetch past and upcoming rounds
    const { otherRounds } = await fetchPastAndUpcomingRounds(supabase, competitionId, roundId, userId);

    // 6. Return props
    return {
      props: {
        initialRoundData: roundResponse.data,
        existingPick: existingPick,
        upcomingRounds: otherRounds || [],
        isEntered: true,
      },
    };

  } catch (error: unknown) {
    console.error('SSR: Unexpected error in MakePicksPage getServerSideProps:', error);
    return { props: { error: 'An unexpected server error occurred.', isEntered: false } };
  }
}; 