import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local file
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Extract Supabase values
const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
// Use service role key instead of anon key to bypass RLS
const supabaseKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error('Supabase credentials not found in .env.local. Make sure SUPABASE_SERVICE_ROLE_KEY is defined.');
  process.exit(1);
}

// Set environment variables for the client
process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrlMatch[1];
process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseKeyMatch[1];

// Import required modules
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/types/supabase';

// Create Supabase admin client with service role key
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('Supabase admin client initialized for resetting fixtures.');

async function resetFixturesProcessedStatus() {
  console.log('Starting to reset results_processed status for all fixtures...');

  try {
    // First get the count of fixtures to reset
    const { data: fixtures, error: countError } = await supabase
      .from('fixtures')
      .select('id')
      .eq('status', 'FT'); // Only count completed fixtures

    if (countError) {
      console.error('Error counting fixtures:', countError);
      return;
    }

    const fixtureCount = fixtures?.length || 0;
    console.log(`Found ${fixtureCount} completed fixtures to reset.`);

    // Now reset all fixtures
    const { error: updateError } = await supabase
      .from('fixtures')
      .update({ results_processed: false })
      .eq('status', 'FT'); // Only update completed fixtures

    if (updateError) {
      console.error('Error resetting fixtures processed status:', updateError);
      return;
    }

    console.log(`Reset results_processed to false for ${fixtureCount} fixtures.`);
    console.log('Fixtures reset successful.');

  } catch (err) {
    console.error('Unhandled error during fixture reset:', err);
  }
}

// Run the function
resetFixturesProcessedStatus().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
}); 