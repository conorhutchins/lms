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
const supabaseKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error('Supabase credentials not found in .env.local');
  process.exit(1);
}

// Remove direct initialization and imports
// process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrlMatch[1];
// process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseKeyMatch[1];

// Now import Supabase client from lib
import { supabase } from '../lib/db.js';
import type { Database } from '../lib/types/supabase.js';

console.log('Supabase client imported for processing results.');

// Define types based on your DB schema (will be used now)
type Fixture = Database['public']['Tables']['fixtures']['Row'];
// type Pick = Database['public']['Tables']['picks']['Row']; // We might not need this specific type directly

async function processResults() {
  console.log('Starting result processing...');

  try {
    // --- Get Active Competition ID ---
    // Assumption: Only one competition is active at a time. Adapt if needed.
    const { data: activeCompetition, error: competitionError } = await supabase
      .from('competitions')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single(); // Expects exactly one row

    if (competitionError || !activeCompetition) {
      console.error('Error fetching active competition or none found:', competitionError);
      return; // Cannot proceed without an active competition
    }
    const activeCompetitionId = activeCompetition.id;
    console.log(`Processing results for active competition: ${activeCompetitionId}`);
    // ---------------------------------

    // 1. Fetch finished fixtures that haven't been processed
    const { data: finishedFixtures, error: fetchError } = await supabase
      .from('fixtures')
      .select('*')
      .eq('status', 'FT') // Assuming 'FT' means Full Time / Finished
      .eq('results_processed', false)
      .order('kickoff_time'); // Process older fixtures first

    if (fetchError) {
      console.error('Error fetching finished fixtures:', fetchError);
      return;
    }

    if (!finishedFixtures || finishedFixtures.length === 0) {
      console.log('No new finished fixtures to process.');
      return;
    }

    console.log(`Found ${finishedFixtures.length} finished fixtures to process.`);

    // --- Get all Team Mappings ---
    // Fetch mapping from external_api_id (integer) to our internal team UUID
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, external_api_id');

    if (teamsError || !teams) {
      console.error('Error fetching teams:', teamsError);
      return;
    }

    // Create a map for quick lookup: external_api_id -> internal_uuid
    const teamApiIdToUuidMap = new Map<number, string>();
    teams.forEach(team => {
      // Ensure external_api_id is treated as a number if it's stored as text/varchar
      const apiId = team.external_api_id ? parseInt(team.external_api_id, 10) : null;
      if (apiId !== null && !isNaN(apiId) && team.id) {
        teamApiIdToUuidMap.set(apiId, team.id);
      }
    });
    console.log(`Loaded ${teamApiIdToUuidMap.size} team mappings.`);
    // ----------------------------- 

    // 2. Loop through each finished fixture
    for (const fixture of finishedFixtures as Fixture[]) {
      console.log(`Processing fixture ID: ${fixture.external_id} (${fixture.home_team} vs ${fixture.away_team})`);

      if (fixture.home_score === null || fixture.away_score === null) {
        console.warn(`Fixture ${fixture.external_id} has status FT but null scores. Skipping.`);
        continue; // Skip this fixture
      }

      if (fixture.gameweek === null) {
        console.warn(`Fixture ${fixture.external_id} has null gameweek. Cannot link to round. Skipping.`);
        continue; // Skip this fixture
      }

      // --- Find the corresponding Round ID ---
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select('id')
        .eq('competition_id', activeCompetitionId)
        .eq('round_number', fixture.gameweek)
        .limit(1)
        .single();

      if (roundError || !roundData) {
        console.warn(`Could not find round for competition ${activeCompetitionId}, gameweek ${fixture.gameweek}. Skipping fixture ${fixture.external_id}.`, roundError);
        continue;
      }
      const roundId = roundData.id;
      // --------------------------------------

      // --- Determine Losing Team UUID(s) ---
      const losingTeamUuids: string[] = [];
      const homeTeamApiId = fixture.home_team_id;
      const awayTeamApiId = fixture.away_team_id;

      const homeTeamUuid = homeTeamApiId ? teamApiIdToUuidMap.get(homeTeamApiId) : null;
      const awayTeamUuid = awayTeamApiId ? teamApiIdToUuidMap.get(awayTeamApiId) : null;

      if (!homeTeamUuid || !awayTeamUuid) {
          console.warn(`Could not map API team IDs (${homeTeamApiId}, ${awayTeamApiId}) to internal UUIDs for fixture ${fixture.external_id}. Skipping pick updates for this fixture.`);
          // Still mark fixture as processed later
      } else {
          if (fixture.home_score <= fixture.away_score) { // Away win or draw
              losingTeamUuids.push(homeTeamUuid);
          }
          if (fixture.home_score >= fixture.away_score) { // Home win or draw
              losingTeamUuids.push(awayTeamUuid);
          }
      }
      // -------------------------------------

      // --- Update Picks for the Round ---
      if (losingTeamUuids.length > 0) {
        console.log(`Updating picks for round ${roundId}. Eliminating picks for team UUIDs: ${losingTeamUuids.join(', ')}`);
        const { error: updatePicksError } = await supabase
          .from('picks')
          .update({ status: 'eliminated' })
          .eq('round_id', roundId)
          .eq('status', 'active') // Only update active picks
          .in('team_id', losingTeamUuids); // Match any of the losing/drawing teams

        if (updatePicksError) {
          console.error(`Error updating picks for round ${roundId} and fixture ${fixture.external_id}:`, updatePicksError);
          // Decide if we should stop or continue
          // continue; // Maybe skip marking fixture as processed if picks fail?
        } else {
             console.log(`Picks updated successfully for round ${roundId}.`);
        }
      } else {
          console.log(`No losing teams identified or team mapping failed for fixture ${fixture.external_id}. No picks updated.`);
      }
      // ----------------------------------

      // 3. Mark fixture as processed (regardless of pick update success/failure?)
      const { error: updateError } = await supabase
        .from('fixtures')
        .update({ results_processed: true })
        .eq('id', fixture.id); // Use the internal UUID `id`

      if (updateError) {
        console.error(`Error marking fixture ${fixture.external_id} as processed:`, updateError);
      } else {
        console.log(`Marked fixture ${fixture.external_id} as processed.`);
      }
    } // End loop through fixtures

    console.log('Result processing finished.');

  } catch (err) {
    console.error('Unhandled error during result processing:', err);
  }
}

// Run the function
processResults().catch(err => {
  console.error("Unhandled error during result processing:", err);
  process.exit(1);
}); 