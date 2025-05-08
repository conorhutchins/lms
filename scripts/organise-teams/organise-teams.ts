// script to organise teams in the teams table on supabase
// it maintains Premier League teams for the current season but won't delete teams just mark as former
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env.local');
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
import type { Database } from '../../lib/types/supabase';

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

console.log('Supabase admin client initialized successfully for team organisation.');

// Current Premier League season configuration
const CURRENT_SEASON = '2023/24'; // Update this each season
const LEAGUE_NAME = 'Premier League';

// Premier League teams for the current season and their API IDs
const currentPremierLeagueTeams = [
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

async function organiseTeams() {
  console.log(`Starting team organisation for ${LEAGUE_NAME} ${CURRENT_SEASON}...`);

  try {
    // Check existing teams
    const { data: existingTeams, error: fetchError } = await supabase
      .from('teams')
      .select('id, name, external_api_id, league');

    if (fetchError) {
      console.error('Error fetching existing teams:', fetchError);
      return;
    }

    console.log(`Found ${existingTeams?.length || 0} existing teams in database.`);

    // 1. Identify teams to ADD (new to Premier League this season)
    const existingTeamNames = new Set(existingTeams?.map(team => team.name) || []);
    const teamsToAdd = currentPremierLeagueTeams.filter(team => !existingTeamNames.has(team.name));
    
    // 2. Identify teams to UPDATE (existing but might need external_api_id or league updates)
    const teamsToUpdate: { id: string; name: string; external_api_id: string; league: string; }[] = [];
    for (const team of currentPremierLeagueTeams) {
      const existingTeam = existingTeams?.find(t => t.name === team.name);
      if (existingTeam) {
        let needsUpdate = false;
        
        // Check if external_api_id needs updating
        if (existingTeam.external_api_id !== team.external_api_id.toString()) {
          needsUpdate = true;
        }
        
        // Check if league needs updating
        if (existingTeam.league !== LEAGUE_NAME) {
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          teamsToUpdate.push({
            id: existingTeam.id,
            name: team.name,
            external_api_id: team.external_api_id.toString(),
            league: LEAGUE_NAME
          });
        }
      }
    }
    
    // 3. Identify Premier League teams from last season that are no longer in the league
    // Don't delete teams, just update their league to reflect they're no longer in Prem
    const currentTeamNames = new Set(currentPremierLeagueTeams.map(team => team.name));
    const teamsToMarkAsFormer = existingTeams
      ?.filter(team => team.league === LEAGUE_NAME && !currentTeamNames.has(team.name))
      .map(team => ({
        id: team.id,
        league: `Former ${LEAGUE_NAME}`
      })) || [];

    // Process: Add new teams
    if (teamsToAdd.length > 0) {
      console.log(`Adding ${teamsToAdd.length} new teams to ${LEAGUE_NAME}...`);
      
      const teamsData = teamsToAdd.map(team => ({
        name: team.name,
        external_api_id: team.external_api_id.toString(),
        league: LEAGUE_NAME
      }));

      const { error: insertError } = await supabase
        .from('teams')
        .insert(teamsData);

      if (insertError) {
        console.error('Error adding new teams:', insertError);
      } else {
        console.log(`Successfully added ${teamsToAdd.length} new teams.`);
      }
    } else {
      console.log('No new teams to add.');
    }

    // Process: Update existing teams
    if (teamsToUpdate.length > 0) {
      console.log(`Updating ${teamsToUpdate.length} existing teams...`);
      
      let updatedCount = 0;
      for (const team of teamsToUpdate) {
        const { error: updateError } = await supabase
          .from('teams')
          .update({
            external_api_id: team.external_api_id,
            league: team.league
          })
          .eq('id', team.id);
          
        if (updateError) {
          console.error(`Error updating ${team.name}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      
      console.log(`Successfully updated ${updatedCount} teams.`);
    } else {
      console.log('No teams need updating.');
    }
    
    // Process: Mark former Premier League teams
    if (teamsToMarkAsFormer.length > 0) {
      console.log(`Marking ${teamsToMarkAsFormer.length} teams as former ${LEAGUE_NAME} teams...`);
      
      let updatedCount = 0;
      for (const team of teamsToMarkAsFormer) {
        const { error: updateError } = await supabase
          .from('teams')
          .update({ league: team.league })
          .eq('id', team.id);
          
        if (updateError) {
          console.error(`Error updating former team (ID: ${team.id}):`, updateError);
        } else {
          updatedCount++;
        }
      }
      
      console.log(`Successfully marked ${updatedCount} teams as former ${LEAGUE_NAME} teams.`);
    } else {
      console.log(`No teams to mark as former ${LEAGUE_NAME} teams.`);
    }

    console.log('Team organization complete!');

  } catch (err) {
    console.error('Unhandled error during team organization:', err);
  }
}

// Run the function
organiseTeams().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
}); 