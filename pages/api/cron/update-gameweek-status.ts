// This is a quick API endpoint for a cron job to call to update the gameweek statuses
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../../lib/types/supabase';
import { createApiRouteCookieMethods } from '../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';

type GameweekWithStatus = {
  id: string;
  league_id: number;
  season: number;
  gameweek_number: number;
  deadline_time: string;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  finished: boolean;
  time_diff?: number; // For sorting and calculations only
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security check: Make sure the secret token is configured and matches
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  console.log('Starting gameweek status update from API endpoint...');

  try {
    // Create Supabase client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Consider using SERVICE_ROLE key for production
      { cookies: createApiRouteCookieMethods(req, res) }
    );

    // Define leagues to process
    const leaguesToUpdate = [
      { leagueId: 39, season: 2023 }, // Premier League 2023
      // Return to this to add other leagues as needed
    ];

    const results = [];

    for (const { leagueId, season } of leaguesToUpdate) {
      console.log(`Processing league ${leagueId}, season ${season}...`);
      
      // 1. Fetch all gameweeks for this league and season
      const { data: gameweeks, error: fetchError } = await supabase
        .from('gameweeks')
        .select('*')
        .eq('league_id', leagueId)
        .eq('season', season)
        .order('gameweek_number', { ascending: true });

      if (fetchError) {
        console.error(`Error fetching gameweeks for league ${leagueId}, season ${season}:`, fetchError);
        results.push({
          league: leagueId,
          season,
          success: false,
          error: fetchError.message
        });
        continue; // Skip to next league
      }

      if (!gameweeks || gameweeks.length === 0) {
        console.log(`No gameweeks found for league ${leagueId}, season ${season}`);
        results.push({
          league: leagueId,
          season,
          success: true,
          message: 'No gameweeks found to update'
        });
        continue; // Skip to next league
      }

      console.log(`Found ${gameweeks.length} gameweeks for league ${leagueId}, season ${season}`);

      // 2. Determine current, next, and previous gameweeks
      const now = new Date();
      
      // Add time difference for sorting
      const gameweeksWithDiff: GameweekWithStatus[] = gameweeks.map(gw => {
        const deadlineDate = new Date(gw.deadline_time);
        const timeDiff = deadlineDate.getTime() - now.getTime();
        
        return {
          ...gw,
          time_diff: timeDiff,
          // Reset all status flags - we'll set them correctly below
          is_current: false,
          is_next: false,
          is_previous: false,
        };
      });

      // Sort by deadline time
      gameweeksWithDiff.sort((a, b) => {
        return new Date(a.deadline_time).getTime() - new Date(b.deadline_time).getTime(); 
      });

      // Find indices for current, previous, and next gameweeks
      let currentIdx = -1;
      let previousIdx = -1;
      let nextIdx = -1;

      // First find the current gameweek (closest future or most recent past)
      const futureGameweeks = gameweeksWithDiff.filter(gw => gw.time_diff! >= 0);
      
      if (futureGameweeks.length > 0) {
        // Current is the closest future gameweek
        currentIdx = gameweeksWithDiff.findIndex(gw => gw.id === futureGameweeks[0].id);
      } else {
        // Current is the most recent past gameweek
        const pastGameweeks = gameweeksWithDiff.filter(gw => gw.time_diff! < 0);
        if (pastGameweeks.length > 0) {
          // Sort by closest to now
          pastGameweeks.sort((a, b) => b.time_diff! - a.time_diff!);
          currentIdx = gameweeksWithDiff.findIndex(gw => gw.id === pastGameweeks[0].id);
        }
      }

      // Set flags based on current index
      if (currentIdx !== -1) {
        // Previous is one before current
        previousIdx = currentIdx > 0 ? currentIdx - 1 : -1;
        
        // Next is one after current
        nextIdx = currentIdx < gameweeksWithDiff.length - 1 ? currentIdx + 1 : -1;
        
        // Set flags
        gameweeksWithDiff[currentIdx].is_current = true;
        
        if (previousIdx !== -1) {
          gameweeksWithDiff[previousIdx].is_previous = true;
          // Mark previous as finished
          gameweeksWithDiff[previousIdx].finished = true;
        }
        
        if (nextIdx !== -1) {
          gameweeksWithDiff[nextIdx].is_next = true;
        }

        // Mark all gameweeks before previous as finished
        for (let i = 0; i < previousIdx; i++) {
          gameweeksWithDiff[i].finished = true;
        }
      }

      // 3. Update gameweeks in the database
      const updateResults = [];
      
      for (const gameweek of gameweeksWithDiff) {
        const { id, is_current, is_next, is_previous, finished } = gameweek;
        
        try {
          const { error: updateError } = await supabase
            .from('gameweeks')
            .update({
              is_current,
              is_next,
              is_previous,
              finished,
              data_updated_at: new Date().toISOString()
            })
            .eq('id', id);
            
          if (updateError) {
            console.error(`Error updating gameweek ${id}:`, updateError);
            updateResults.push({ id, success: false, error: updateError.message });
          } else {
            updateResults.push({ id, success: true });
          }
        } catch (err) {
          console.error(`Exception updating gameweek ${id}:`, err);
          updateResults.push({ id, success: false, error: String(err) });
        }
      }
      
      // Calculate success rate for this league
      const successCount = updateResults.filter(r => r.success).length;
      
      results.push({
        league: leagueId,
        season,
        success: true,
        gameweeks_total: updateResults.length,
        gameweeks_updated: successCount,
        current_gameweek: currentIdx !== -1 ? gameweeksWithDiff[currentIdx].gameweek_number : null,
        next_gameweek: nextIdx !== -1 ? gameweeksWithDiff[nextIdx].gameweek_number : null,
        previous_gameweek: previousIdx !== -1 ? gameweeksWithDiff[previousIdx].gameweek_number : null
      });
      
      console.log(`Updated ${successCount} of ${updateResults.length} gameweeks for league ${leagueId}, season ${season}`);
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error) {
    console.error('Unexpected error in update-gameweek-status API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 