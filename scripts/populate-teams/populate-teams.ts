import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf8');

// Extract Supabase values and set them directly as environment variables
const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
// Use service role key instead of anon key to bypass RLS
const supabaseKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error('Supabase credentials not found in .env.local. Make sure SUPABASE_SERVICE_ROLE_KEY is defined.');
  process.exit(1);
}

// Set environment variables BEFORE importing modules that use them
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

console.log('Supabase admin client initialized successfully for team population.');

// Premier League teams (2023 season) and their API IDs
const premierLeagueTeams = [
  { name: 'Arsenal', external_api_id: 42 },
  { name: 'Aston Villa', external_api_id: 66 },
  { name: 'Bournemouth', external_api_id: 35 },
  { name: 'Brentford', external_api_id: 55 },
  { name: 'Brighton', external_api_id: 51 },
  { name: 'Burnley', external_api_id: 44 },
  { name: 'Chelsea', external_api_id: 49 },
  { name: 'Crystal Palace', external_api_id: 52 },
  { name: 'Everton', external_api_id: 45 },
  { name: 'Fulham', external_api_id: 36 },
  { name: 'Liverpool', external_api_id: 40 },
  { name: 'Luton', external_api_id: 1359 },
  { name: 'Manchester City', external_api_id: 50 },
  { name: 'Manchester United', external_api_id: 33 },
  { name: 'Newcastle', external_api_id: 34 },
  { name: 'Nottingham Forest', external_api_id: 65 },
  { name: 'Sheffield Utd', external_api_id: 62 },
  { name: 'Tottenham', external_api_id: 47 },
  { name: 'West Ham', external_api_id: 48 },
  { name: 'Wolves', external_api_id: 39 }
];

async function populateTeams() {
  console.log('Starting team population...');

  try {
    // Check existing teams
    const { data: existingTeams, error: fetchError } = await supabase
      .from('teams')
      .select('name, external_api_id');

    if (fetchError) {
      console.error('Error fetching existing teams:', fetchError);
      return;
    }

    console.log(`Found ${existingTeams?.length || 0} existing teams.`);

    // Create a map of existing team names
    const existingTeamNames = new Set(existingTeams?.map(team => team.name) || []);
    
    // Filter out teams that already exist
    const teamsToInsert = premierLeagueTeams.filter(team => !existingTeamNames.has(team.name));

    if (teamsToInsert.length === 0) {
      console.log('All teams already exist. Checking for external_api_id updates...');
      
      // Update teams that may have missing or changed external_api_id
      let updatedCount = 0;
      for (const team of premierLeagueTeams) {
        const existingTeam = existingTeams?.find(t => t.name === team.name);
        if (existingTeam && existingTeam.external_api_id !== team.external_api_id.toString()) {
          console.log(`Updating external_api_id for ${team.name}: ${existingTeam.external_api_id || 'null'} → ${team.external_api_id}`);
          
          const { error: updateError } = await supabase
            .from('teams')
            .update({ external_api_id: team.external_api_id.toString() })
            .eq('name', team.name);
            
          if (updateError) {
            console.error(`Error updating ${team.name}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }
      
      console.log(`Updated external_api_id for ${updatedCount} teams.`);
      return;
    }

    console.log(`Inserting ${teamsToInsert.length} new teams...`);

    // Prepare teams for insertion with the league field
    const teamsData = teamsToInsert.map(team => ({
      name: team.name,
      external_api_id: team.external_api_id.toString(), // Convert to string to match column type
      league: 'Premier League'
    }));

    // Insert teams
    const { error: insertError } = await supabase
      .from('teams')
      .insert(teamsData);

    if (insertError) {
      console.error('Error inserting teams:', insertError);
    } else {
      console.log(`Successfully inserted ${teamsToInsert.length} teams.`);
    }

  } catch (err) {
    console.error('Unhandled error during team population:', err);
  }
}

// Run the function
populateTeams().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
}); 