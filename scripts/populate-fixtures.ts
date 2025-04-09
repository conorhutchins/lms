import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios, { AxiosError } from 'axios';
import type { Database } from '../lib/types/supabase';

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

// Set the values as environment variables for imports that might need them
process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrlMatch[1];
process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseKeyMatch[1];

// Now it's safe to import the supabase client
import { createClient } from '@supabase/supabase-js';

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

console.log('Supabase admin client initialized successfully');

// --- Define Interface based on API response ---
interface ApiFootballFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: { first: number | null; second: number | null } | null;
    venue: { id: number | null; name: string | null; city: string | null } | null;
    status: { long: string | null; short: string | null; elapsed: number | null; extra?: unknown | null }; // Replaced any with unknown
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
    standings?: boolean | null;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null } | null;
  score: {
    halftime: { home: number | null; away: number | null } | null;
    fulltime: { home: number | null; away: number | null } | null;
    extratime: { home: number | null; away: number | null } | null;
    penalty: { home: number | null; away: number | null } | null;
  } | null;
}
// ---------------------------------------------

type FixtureInsert = Database['public']['Tables']['fixtures']['Insert'];

// Use the extracted values
const API_FOOTBALL_KEY = apiKeyMatch[1];
const API_FOOTBALL_HOST = apiHostMatch ? apiHostMatch[1] : 'v3.football.api-sports.io';

const LEAGUES_TO_FETCH = [
    // Using 2023 season data for development (free on API)
    { league: 39, season: 2023 }, // Premier League 2023
    
    // PRODUCTION: Uncomment below when using paid API to get current season data
    // { league: 39, season: 2024 }, // Premier League 2024-25
    // Add other leagues/seasons if needed
];

// Ensure host is defined before constructing endpoint
if (!API_FOOTBALL_HOST) {
    console.error("Error: API_FOOTBALL_HOST environment variable is not set and no default provided.");
    process.exit(1); // Exit if host is not configured
}

const API_ENDPOINT = `https://${API_FOOTBALL_HOST}/fixtures`;
// ---------------------

// Function to map API response data to the Supabase table structure
function mapApiResponseToDbSchema(apiFixture: ApiFootballFixture): FixtureInsert | null {
    // Basic validation - skip if essential data is missing
    // Using the defined interface, so direct access is safer
    if (!apiFixture.fixture?.id || !apiFixture.league?.id || !apiFixture.league?.season || !apiFixture.teams?.home?.id || !apiFixture.teams?.away?.id) {
        console.warn('Skipping fixture due to missing essential data:', apiFixture.fixture?.id);
        return null;
    }

    // Convert scores - API might return null before FT
    // First check if goals object exists, then access its properties
    const homeScore = apiFixture.goals ? (apiFixture.goals.home !== null ? Number(apiFixture.goals.home) : null) : null;
    const awayScore = apiFixture.goals ? (apiFixture.goals.away !== null ? Number(apiFixture.goals.away) : null) : null;

    // Extract gameweek/round number from the round string (e.g., "Regular Season - 1" -> 1)
    let gameweek: number | null = null;
    if (apiFixture.league?.round) {
        // Try to extract the number at the end of the round string
        const roundMatch = apiFixture.league.round.match(/(\d+)$/);
        if (roundMatch && roundMatch[1]) {
            gameweek = parseInt(roundMatch[1], 10);
            if (isNaN(gameweek)) {
                gameweek = null;
            }
        }
    }

    return {
        external_id: Number(apiFixture.fixture.id),
        league_id: Number(apiFixture.league.id),
        season: Number(apiFixture.league.season),
        round: apiFixture.league.round,
        gameweek: gameweek,  // Add the extracted gameweek number
        home_team: apiFixture.teams.home.name,
        away_team: apiFixture.teams.away.name,
        home_team_id: Number(apiFixture.teams.home.id),
        away_team_id: Number(apiFixture.teams.away.id),
        kickoff_time: apiFixture.fixture.date, // API-Football uses ISO 8601 format
        status: apiFixture.fixture.status?.short,
        home_score: homeScore,
        away_score: awayScore,
        results_processed: false, // Default all new fixtures to not processed
    };
}

// Main function to fetch and populate data
async function populateFixtures() {
    console.log('Starting fixture population...');

    if (!API_FOOTBALL_KEY) {
        console.error('Error: API_FOOTBALL_KEY environment variable is not set.');
        return;
    }

    const allFixturesToUpsert: FixtureInsert[] = [];

    for (const { league, season } of LEAGUES_TO_FETCH) {
        console.log(`Fetching fixtures for League ${league}, Season ${season}...`);
        try {
            // Explicitly type the expected response structure
            const response = await axios.get<{ response: ApiFootballFixture[] }>(API_ENDPOINT, {
                params: { league, season },
                headers: {
                    'x-rapidapi-key': API_FOOTBALL_KEY,
                    'x-rapidapi-host': API_FOOTBALL_HOST,
                },
            });

            // Check if response contains data
            if (response.data && response.data.response && Array.isArray(response.data.response)) {
                const fixturesFromApi = response.data.response;
                console.log(`Received ${fixturesFromApi.length} fixtures from API for League ${league}.`);

                // Map API data to DB schema, filtering out nulls from invalid entries
                const mappedFixtures = fixturesFromApi
                    .map(mapApiResponseToDbSchema)
                    // Explicitly type 'f' in the filter callback
                    .filter((f: FixtureInsert | null): f is FixtureInsert => f !== null);

                allFixturesToUpsert.push(...mappedFixtures);
            } else {
                console.warn(`No fixtures data found in API response for League ${league}. Response:`, response.data);
            }
        // Catch block with more specific error typing
        } catch (error) {
            if (axios.isAxiosError(error)) {
              const axiosError = error as AxiosError; // Type assertion for AxiosError
               console.error(`Error fetching fixtures for League ${league}: Status ${axiosError.response?.status}`, axiosError.response?.data || axiosError.message);
            } else {
               console.error(`Non-Axios error fetching for League ${league}:`, error);
            }
        }
    }

    if (allFixturesToUpsert.length === 0) {
        console.log('No valid fixtures found to upsert. Exiting.');
        return;
    }

    console.log(`Attempting to upsert ${allFixturesToUpsert.length} fixtures into Supabase...`);

    // Upsert data into Supabase
    // The error indicates there's no unique constraint on external_id
    // Let's try to fetch existing fixtures first and then handle inserts and updates separately

    // First, try to get all existing fixtures for this season and league
    const existingFixturesResult = await supabase
      .from('fixtures')
      .select('id, external_id')
      .eq('season', LEAGUES_TO_FETCH[0].season)
      .eq('league_id', LEAGUES_TO_FETCH[0].league);

    if (existingFixturesResult.error) {
      console.error('Error fetching existing fixtures:', existingFixturesResult.error);
      return;
    }

    const existingFixtures = existingFixturesResult.data || [];
    const existingExternalIds = new Set(existingFixtures.map(f => f.external_id));
    const existingIdMap = new Map(existingFixtures.map(f => [f.external_id, f.id]));

    // Split fixtures into inserts and updates
    const fixturesToInsert = allFixturesToUpsert.filter(f => !existingExternalIds.has(f.external_id));
    const fixturesToUpdate = allFixturesToUpsert.filter(f => existingExternalIds.has(f.external_id))
      .map(f => ({
        ...f,
        id: existingIdMap.get(f.external_id), // Add the Supabase ID for the update
      }));

    console.log(`Inserting ${fixturesToInsert.length} new fixtures...`);
    if (fixturesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('fixtures')
        .insert(fixturesToInsert);

      if (insertError) {
        console.error('Error inserting fixtures:', insertError);
      } else {
        console.log(`Successfully inserted ${fixturesToInsert.length} fixtures.`);
      }
    }

    console.log(`Updating ${fixturesToUpdate.length} existing fixtures...`);
    if (fixturesToUpdate.length > 0) {
      let updatedCount = 0;
      let errorCount = 0;
      
      // Update fixtures in smaller batches to avoid rate limits
      const batchSize = 50;
      for (let i = 0; i < fixturesToUpdate.length; i += batchSize) {
        const batch = fixturesToUpdate.slice(i, i + batchSize);
        
        const { error: updateError } = await supabase
          .from('fixtures')
          .upsert(batch, { onConflict: 'id' }); // Use 'id' as the conflict target
        
        if (updateError) {
          console.error(`Error updating fixtures batch ${i/batchSize + 1}:`, updateError);
          errorCount++;
        } else {
          updatedCount += batch.length;
          console.log(`Updated batch ${i/batchSize + 1}/${Math.ceil(fixturesToUpdate.length/batchSize)}`);
        }
      }
      
      console.log(`Successfully updated ${updatedCount}/${fixturesToUpdate.length} fixtures.`);
      if (errorCount > 0) {
        console.log(`Encountered errors in ${errorCount} update batches.`);
      }
    }

    console.log('Fixture population completed.');
}

// Run the function
populateFixtures().catch(err => {
    console.error("Unhandled error during fixture population:", err);
});