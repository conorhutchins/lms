import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios, { AxiosError } from 'axios';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local file
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Extract API Football values
const apiKeyMatch = envContent.match(/API_FOOTBALL_KEY=([^\r\n]+)/);
const apiHostMatch = envContent.match(/API_FOOTBALL_HOST=([^\r\n]+)/);

// Extract Supabase values
const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
// Use service role key instead of anon key to bypass RLS
const supabaseKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

if (!apiKeyMatch) {
  console.error('API_FOOTBALL_KEY not found in .env.local');
  process.exit(1);
}

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

console.log('Supabase admin client initialized for processing results.');

// Define types based on your DB schema
type Fixture = Database['public']['Tables']['fixtures']['Row'];
type FixtureUpdate = Database['public']['Tables']['fixtures']['Update'];

// Use the extracted API values
const API_FOOTBALL_KEY = apiKeyMatch[1];
const API_FOOTBALL_HOST = apiHostMatch ? apiHostMatch[1] : 'v3.football.api-sports.io';
const API_ENDPOINT = `https://${API_FOOTBALL_HOST}/fixtures`;

// Interface for API response
interface ApiFootballFixture {
  fixture: {
    id: number;
    status: { short: string; };
  };
  goals: { home: number | null; away: number | null; };
  teams: {
    home: { id: number; name: string; };
    away: { id: number; name: string; };
  };
}

async function updateFixtureResults() {
  console.log('Starting fixture results update...');

  try {
    // Get fixtures from the last 7 days that are not in a final state yet
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const { data: fixtures, error: fetchError } = await supabase
      .from('fixtures')
      .select('*')
      .gt('kickoff_time', sevenDaysAgo.toISOString())
      .not('status', 'in', '("FT","AET","PEN")') // Not in a final state
      .order('kickoff_time');

    if (fetchError) {
      console.error('Error fetching fixtures:', fetchError);
      return;
    }

    if (!fixtures || fixtures.length === 0) {
      console.log('No fixtures found to update.');
      return;
    }

    console.log(`Found ${fixtures.length} fixtures to check for updates.`);

    // Batch fixtures by their external IDs to make API calls more efficient
    const externalIds = fixtures.map(f => f.external_id);
    
    // Fetch latest data for these fixtures from the API
    try {
      console.log(`Fetching latest data from API for ${externalIds.length} fixtures...`);
      const response = await axios.get<{ response: ApiFootballFixture[] }>(API_ENDPOINT, {
        params: { ids: externalIds.join('-') },  // Send all IDs in a single call
        headers: {
          'x-rapidapi-key': API_FOOTBALL_KEY,
          'x-rapidapi-host': API_FOOTBALL_HOST,
        },
      });

      if (!response.data || !response.data.response || !Array.isArray(response.data.response)) {
        console.error('API response does not have the expected structure:', response.data);
        return;
      }

      const apiFixtures = response.data.response;
      console.log(`Received data for ${apiFixtures.length} fixtures from API.`);

      // Process each fixture and update the database
      let updatedCount = 0;
      for (const apiFixture of apiFixtures) {
        const fixture = fixtures.find(f => f.external_id === apiFixture.fixture.id);
        if (!fixture) continue;  // Skip if we can't find the matching fixture

        // Determine if the fixture needs an update
        const needsUpdate = 
          apiFixture.fixture.status.short !== fixture.status ||
          apiFixture.goals.home !== fixture.home_score ||
          apiFixture.goals.away !== fixture.away_score;

        if (needsUpdate) {
          console.log(`Updating fixture ${fixture.external_id} (${fixture.home_team} vs ${fixture.away_team})`);
          
          const update: FixtureUpdate = {
            status: apiFixture.fixture.status.short,
            home_score: apiFixture.goals.home,
            away_score: apiFixture.goals.away,
            // Only mark as processed if the match is finished
            results_processed: apiFixture.fixture.status.short === 'FT' ? false : null
          };

          const { error: updateError } = await supabase
            .from('fixtures')
            .update(update)
            .eq('id', fixture.id);

          if (updateError) {
            console.error(`Error updating fixture ${fixture.external_id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`Updated fixture ${fixture.external_id}.`);
          }
        }
      }

      console.log(`Updated ${updatedCount} fixtures with latest results.`);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(`Error fetching fixtures from API: Status ${axiosError.response?.status}`, 
                      axiosError.response?.data || axiosError.message);
      } else {
        console.error('Error fetching fixtures from API:', error);
      }
    }
  } catch (err) {
    console.error('Unhandled error during fixture update:', err);
  }
}

async function processResults() {
  console.log('Starting result processing...');

  try {
    // First, update fixtures with the latest results
    await updateFixtureResults();

    // --- Get Active Competition ID ---
    // Assumption: Only one competition is active at a time. Adapt if needed.
    const { data: activeCompetition, error: competitionError } = await supabase
      .from('competitions')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(); // Use maybeSingle instead of single to handle 0 rows gracefully

    let activeCompetitionId: string | null = null;
    if (competitionError) {
      console.error('Error fetching active competition:', competitionError);
    } else if (!activeCompetition) {
      console.warn('No active competition found. Will only update fixture results.');
    } else {
      activeCompetitionId = activeCompetition.id;
      console.log(`Processing results for active competition: ${activeCompetitionId}`);
    }
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

    // If no active competition, we'll just mark fixtures as processed without updating picks
    if (!activeCompetitionId) {
      console.log('No active competition. Will mark fixtures as processed without updating picks.');
      for (const fixture of finishedFixtures) {
        const { error: updateError } = await supabase
          .from('fixtures')
          .update({ results_processed: true })
          .eq('id', fixture.id);

        if (updateError) {
          console.error(`Error marking fixture ${fixture.external_id} as processed:`, updateError);
        } else {
          console.log(`Marked fixture ${fixture.external_id} as processed (no competition updates).`);
        }
      }
      console.log('Result processing finished (fixtures only).');
      return;
    }

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
        .maybeSingle();

      if (roundError) {
        console.warn(`Error finding round for competition ${activeCompetitionId}, gameweek ${fixture.gameweek}:`, roundError);
        continue;
      }
      
      if (!roundData) {
        console.warn(`Could not find round for competition ${activeCompetitionId}, gameweek ${fixture.gameweek}. Skipping fixture ${fixture.external_id}.`);
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