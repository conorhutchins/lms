import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/types/supabase';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables with absolute path
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '../..');
  
  // Try loading from .env.local first (Next.js convention)
  const envLocalPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    console.log(`Loading environment from: ${envLocalPath}`);
    config({ path: envLocalPath });
  } else {
    // Fall back to .env if .env.local doesn't exist
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
      console.log(`Loading environment from: ${envPath}`);
      config({ path: envPath });
    } else {
      console.log('No .env or .env.local file found, will use environment variables directly');
      config(); // Try to load from process.env directly
    }
  }
} catch (error) {
  console.error('Error setting up environment:', error);
  config(); // Fallback to regular config
}

// Check for required Supabase environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local file");
  process.exit(1);
}

console.log('Supabase URL found:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Yes' : 'No');
console.log('Supabase service role key found:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Yes' : 'No');

// Initialize Supabase client with service role key for admin access
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Using the service role key for background jobs
);

// Test the Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Simple query to test the connection
    const { error } = await supabase
      .from('gameweeks')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error testing Supabase connection:', error);
      return false;
    }
    
    console.log('Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('Exception testing Supabase connection:', error);
    return false;
  }
}

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
  time_diff?: number; // This is for internal calculations, not stored in DB
};

/**
 * Updates the status flags (is_current, is_next, is_previous) for gameweeks
 * based on the current date and the gameweek deadline times.
 */
async function updateGameweekStatuses() {
  try {
    console.log('Starting gameweek status update...');
    
    // First test the connection
    const connectionSuccessful = await testSupabaseConnection();
    if (!connectionSuccessful) {
      throw new Error('Could not establish Supabase connection');
    }
    
    // Define which leagues and seasons to update
    const leaguesToUpdate = [
      { leagueId: 39, season: 2023 }, // Premier League 2023
      // Add more leagues/seasons as needed
    ];

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
        continue; // Skip to next league/season
      }

      if (!gameweeks || gameweeks.length === 0) {
        console.log(`No gameweeks found for league ${leagueId}, season ${season}`);
        continue; // Skip to next league/season
      }

      console.log(`Found ${gameweeks.length} gameweeks for league ${leagueId}, season ${season}`);

      // 2. Determine current, next, and previous gameweeks based on deadline dates
      const now = new Date();
      console.log(`Current date: ${now.toISOString()}`);

      // Calculate time difference from now for each gameweek
      const gameweeksWithDiff: GameweekWithStatus[] = gameweeks.map(gw => {
        const deadlineDate = new Date(gw.deadline_time);
        const timeDiff = deadlineDate.getTime() - now.getTime();
        
        return {
          ...gw,
          time_diff: timeDiff,
          // Reset all flags - we'll set them correctly below
          is_current: false,
          is_next: false,
          is_previous: false,
        };
      });

      // Sort by deadline time (ascending)
      gameweeksWithDiff.sort((a, b) => {
        return new Date(a.deadline_time).getTime() - new Date(b.deadline_time).getTime();
      });

      // Find indices for current, next, and previous
      let currentIdx = -1;
      let previousIdx = -1;
      let nextIdx = -1;

      // First, find the current gameweek (first one with deadline in the future or closest past)
      const futureGameweeks = gameweeksWithDiff.filter(gw => gw.time_diff! >= 0);
      
      if (futureGameweeks.length > 0) {
        // If we have future gameweeks, the current one is the closest future gameweek
        currentIdx = gameweeksWithDiff.findIndex(gw => gw.id === futureGameweeks[0].id);
      } else {
        // If no future gameweeks, check if we're at the end of the season
        const pastGameweeks = gameweeksWithDiff.filter(gw => gw.time_diff! < 0);
        
        // Check if we're more than 7 days past the final gameweek's deadline
        const finalGameweek = gameweeksWithDiff[gameweeksWithDiff.length - 1];
        const daysSinceLastGameweek = Math.abs(finalGameweek.time_diff!) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastGameweek > 7) {
          // More than a week since the season ended - mark all as finished, none as current/next/previous
          console.log(`Season ${season} appears to be complete (${daysSinceLastGameweek.toFixed(1)} days since final gameweek)`);
          currentIdx = -1; // No current gameweek
          
          // Mark all gameweeks as finished
          gameweeksWithDiff.forEach(gw => {
            gw.finished = true;
            gw.is_current = false;
            gw.is_next = false;
            gw.is_previous = false;
          });
        } else {
          // Season recently ended, still mark the final gameweek as "current" for a week
          if (pastGameweeks.length > 0) {
            // Find the closest past gameweek
            pastGameweeks.sort((a, b) => b.time_diff! - a.time_diff!); // Sort by closest to now
            currentIdx = gameweeksWithDiff.findIndex(gw => gw.id === pastGameweeks[0].id);
          }
        }
      }

      // Set next and previous based on currentIdx (only if a current gameweek was identified)
      if (currentIdx !== -1) {
        // Previous is the gameweek before current
        previousIdx = currentIdx > 0 ? currentIdx - 1 : -1;
        
        // Next is the gameweek after current
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

        // Also mark all gameweeks before 'previous' as finished
        for (let i = 0; i < previousIdx; i++) {
          gameweeksWithDiff[i].finished = true;
        }
      } else {
        console.log(`No current gameweek identified for league ${leagueId}, season ${season} (season may be complete)`);
      }

      // 3. Update gameweeks in the database
      console.log('Updating gameweek statuses in database...');
      
      // Track which gameweeks were updated
      const updateResults = [];
      
      for (const gameweek of gameweeksWithDiff) {
        const { id, is_current, is_next, is_previous, finished } = gameweek;
        
        // Log what we're updating to
        const statusFlags = [];
        if (is_current) statusFlags.push("CURRENT");
        if (is_next) statusFlags.push("NEXT");
        if (is_previous) statusFlags.push("PREVIOUS");
        if (finished) statusFlags.push("FINISHED");
        
        console.log(`Updating gameweek ${gameweek.gameweek_number}: ${statusFlags.join(", ") || "NO_FLAGS"}`);
        
        // Update only the status flags and data_updated_at
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
      
      // Summary of updates
      const successCount = updateResults.filter(r => r.success).length;
      console.log(`Successfully updated ${successCount} of ${updateResults.length} gameweeks for league ${leagueId}, season ${season}`);
      
      // Log any errors
      const errors = updateResults.filter(r => !r.success);
      if (errors.length > 0) {
        console.warn(`${errors.length} gameweeks had errors during update`);
        errors.forEach(e => console.warn(`- Gameweek ${e.id}: ${e.error}`));
      }
    }
    
    console.log('Gameweek status update completed successfully.');
    
  } catch (error) {
    console.error('Error in updateGameweekStatuses:', error);
  }
}

// Run the function if this script is called directly
if (process.env.NODE_ENV !== 'test') {
  updateGameweekStatuses()
    .then(() => {
      console.log('Script execution complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('Script execution failed:', err);
      process.exit(1);
    });
}

// Export for use in other modules or testing
export { updateGameweekStatuses }; 