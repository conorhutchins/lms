// script to check the current state of rounds for a competition
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

// check the current state of rounds for a competition
async function checkRounds() {
  try {
    console.log('Starting rounds check...');
    
    // First test the connection
    const connectionSuccessful = await testSupabaseConnection();
    if (!connectionSuccessful) {
      throw new Error('Could not establish Supabase connection');
    }
    
    // Get current date for comparison
    const now = new Date();
    console.log(`Current date: ${now.toISOString()}`);
    
    // 1. Fetch competitions
    const { data: competitions, error: competitionsError } = await supabase
      .from('competitions')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(5);

    if (competitionsError) {
      console.error('Error fetching competitions:', competitionsError);
      return;
    }

    console.log(`Found ${competitions?.length || 0} recent competitions`);
    
    // For each competition, check the rounds
    for (const competition of competitions || []) {
      console.log(`\nCompetition: ${competition.title} (${competition.id})`);
      
      // 2. Fetch rounds for this competition
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select(`
          id, 
          round_number, 
          deadline_date
        `)
        .eq('competition_id', competition.id)
        .order('round_number', { ascending: true });

      if (roundsError) {
        console.error(`Error fetching rounds for competition ${competition.id}:`, roundsError);
        continue;
      }

      console.log(`Found ${rounds?.length || 0} rounds for competition ${competition.id}`);
      
      if (rounds && rounds.length > 0) {
        // Group rounds by past/future deadline
        const pastDeadlineRounds = rounds.filter(r => new Date(r.deadline_date) < now);
        const futureDeadlineRounds = rounds.filter(r => new Date(r.deadline_date) >= now);
        
        console.log(`\nPast deadline rounds (${pastDeadlineRounds.length}):`);
        pastDeadlineRounds.forEach(r => {
          console.log(`  Round ${r.round_number}: ${r.id} - Deadline: ${r.deadline_date} (${new Date(r.deadline_date).toLocaleString()})`);
        });
        
        console.log(`\nFuture deadline rounds (${futureDeadlineRounds.length}):`);
        futureDeadlineRounds.forEach(r => {
          console.log(`  Round ${r.round_number}: ${r.id} - Deadline: ${r.deadline_date} (${new Date(r.deadline_date).toLocaleString()})`);
        });
        
        // If there are rounds with deadlines in the future
        if (futureDeadlineRounds.length > 0) {
          console.log('\nFuture rounds have been found. You should be able to see these in the UI.');
        } else {
          console.log('\nNo future rounds found! This is why you only see Round 1 in the UI.');
          console.log('You need to update the deadline_date field for some rounds to be in the future.');
        }
      } else {
        console.log(`No rounds found for competition ${competition.id}`);
      }
    }
    
    console.log('\nRounds check completed successfully.');
    
  } catch (error) {
    console.error('Error in checkRounds:', error);
  }
}

// Run the function if this script is called directly
if (process.env.NODE_ENV !== 'test') {
  checkRounds()
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
export { checkRounds }; 