// script to update the round deadlines for a competition for testing purposes
// it creates a mix of past, current, upcoming, and future rounds
// it is used to test the sliding window behavior of the UI
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
  const rootDir = path.resolve(__dirname, '..');
  
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

// Initialise Supabase client with service role key for admin access
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

/**
 * Updates round deadlines to create a mix of past, current, upcoming, and future rounds
 * for testing UI behavior with the sliding window
 */
async function updateRoundDeadlines() {
  try {
    console.log('Starting round deadline update...');
    
    // First test the connection
    const connectionSuccessful = await testSupabaseConnection();
    if (!connectionSuccessful) {
      throw new Error('Could not establish Supabase connection');
    }
    
    // Get current date for comparison
    const now = new Date();
    console.log(`Current date: ${now.toISOString()}`);
    
    // 1. Fetch the competition (assuming we're using the Premier League)
    const { data: competitions, error: competitionsError } = await supabase
      .from('competitions')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(1);

    if (competitionsError || !competitions || competitions.length === 0) {
      console.error('Error fetching competitions:', competitionsError);
      return;
    }

    const competition = competitions[0];
    console.log(`Using competition: ${competition.title} (${competition.id})`);
    
    // 2. Fetch all rounds for this competition
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, round_number, deadline_date')
      .eq('competition_id', competition.id)
      .order('round_number', { ascending: true });

    if (roundsError || !rounds || rounds.length === 0) {
      console.error(`Error fetching rounds for competition ${competition.id}:`, roundsError);
      return;
    }

    console.log(`Found ${rounds.length} rounds for competition ${competition.id}`);
    
    // 3. Update rounds to have a mix of past and future deadlines
    const updatedRounds = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon
    
    // We'll create:
    // - Past rounds (1-2)
    // - Current round (3)
    // - Upcoming rounds (4-6)
    // - Future rounds (7+)
    
    // Keep track of updated rounds by status
    const statusCounts = {
      'PAST': 0,
      'CURRENT': 0,
      'UPCOMING': 0,
      'FUTURE': 0
    };
    
    // Define status type to match the keys in statusCounts
    type RoundStatus = 'PAST' | 'CURRENT' | 'UPCOMING' | 'FUTURE';
    
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const newDeadline = new Date(today);
      let status: RoundStatus = 'PAST'; // Default to PAST, will be overwritten
      
      // Determine deadline based on round number
      if (round.round_number <= 2) {
        // PAST: Rounds 1-2 (deadlines in the past)
        newDeadline.setDate(today.getDate() - (7 - round.round_number * 3)); // 7, 4 days ago
        status = 'PAST';
      } 
      else if (round.round_number === 3) {
        // CURRENT: Round 3 (deadline tomorrow)
        newDeadline.setDate(today.getDate() + 1);
        status = 'CURRENT';
      } 
      else if (round.round_number <= 6) {
        // UPCOMING: Rounds 4-6 (deadlines in near future within the sliding window)
        newDeadline.setDate(today.getDate() + ((round.round_number - 3) * 7)); // 7, 14, 21 days in future
        status = 'UPCOMING';
      } 
      else {
        // FUTURE: Rounds 7+ (deadlines beyond the sliding window)
        newDeadline.setDate(today.getDate() + 28 + ((round.round_number - 7) * 7)); // 28+ days in future
        status = 'FUTURE';
      }
      
      const newDeadlineISO = newDeadline.toISOString();
      console.log(`Updating Round ${round.round_number} deadline to ${newDeadlineISO} (${newDeadline.toLocaleString()}) - Status: ${status}`);
      
      // Update the round in Supabase
      const { data, error } = await supabase
        .from('rounds')
        .update({ deadline_date: newDeadlineISO })
        .eq('id', round.id)
        .select();
      
      if (error) {
        console.error(`Error updating round ${round.id}:`, error);
      } else {
        console.log(`✓ Successfully updated Round ${round.round_number}`);
        statusCounts[status]++;
        updatedRounds.push({...data[0], status});
      }
    }
    
    // 4. Summarise updates
    console.log(`\n--- Round Deadline Update Summary ---`);
    console.log(`PAST rounds: ${statusCounts.PAST}`);
    console.log(`CURRENT round: ${statusCounts.CURRENT}`);
    console.log(`UPCOMING rounds: ${statusCounts.UPCOMING}`);
    console.log(`FUTURE rounds: ${statusCounts.FUTURE}`);
    console.log(`Total updated: ${updatedRounds.length} rounds`);
    
    // Show detailed information about the rounds
    console.log("\nDetailed round information:");
    updatedRounds.sort((a, b) => a.round_number - b.round_number);
    
    updatedRounds.forEach(round => {
      const deadline = new Date(round.deadline_date);
      const isPast = deadline < now;
      const daysFromNow = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Round ${round.round_number}: ${round.status} - Deadline: ${deadline.toLocaleString()} (${isPast ? 'PAST' : daysFromNow + ' days from now'})`);
    });
    
    console.log('\nRound deadline update completed successfully.');
    console.log('You should now be able to test the UI with the sliding window behavior.');
    
  } catch (error) {
    console.error('Error in updateRoundDeadlines:', error);
  }
}

// Run the function if this script is called directly
if (process.env.NODE_ENV !== 'test') {
  updateRoundDeadlines()
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
export { updateRoundDeadlines }; 