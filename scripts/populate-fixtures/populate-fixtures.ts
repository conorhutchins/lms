// scripts/populate-fixtures.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import type { Database } from '../lib/types/supabase';

// Define Types based on Supabase schema
type FixtureInsert = Database['public']['Tables']['fixtures']['Insert'];
type GameweekInsert = Database['public']['Tables']['gameweeks']['Insert'];

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Environment Variable Loading ---
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error(`Error: .env.local file not found at ${envPath}`);
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf8');

// Function to safely extract env var
const getEnvVar = (key: string): string | null => {
  const match = envContent.match(new RegExp(`^${key}=([^\r\n]+)`, 'm'));
  return match ? match[1] : null;
};

// Extract API Football values
const API_FOOTBALL_KEY = getEnvVar('API_FOOTBALL_KEY');
const API_FOOTBALL_HOST = getEnvVar('API_FOOTBALL_HOST') || 'v3.football.api-sports.io'; // Default host

// Extract Supabase values (using SERVICE_ROLE_KEY)
const NEXT_PUBLIC_SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

// Validate required environment variables
if (!API_FOOTBALL_KEY) {
  console.error('Error: API_FOOTBALL_KEY not found in .env.local');
  process.exit(1);
}
if (!NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

// Set environment variables (needed if imports rely on them, though direct use is better)
process.env.NEXT_PUBLIC_SUPABASE_URL = NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY;

// --- Supabase Client Initialization ---
// Now it's safe to import the supabase client
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client with service role key
const supabase = createClient<Database>(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
console.log('Supabase admin client initialized successfully');

// --- API-Football Interface ---
interface ApiFootballFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string; // ISO 8601 timestamp string
    timestamp: number;
    periods: { first: number | null; second: number | null } | null;
    venue: { id: number | null; name: string | null; city: string | null } | null;
    status: { long: string | null; short: string | null; elapsed: number | null; };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string; // e.g., "Regular Season - 1"
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null } | null;
  score: unknown | null;
}
// ---------------------------------------------

// --- Configuration ---
const LEAGUES_TO_FETCH = [
    // Using 2023 season data for development (free on API)
    { leagueId: 39, season: 2023 }, // Premier League 2023

    // PRODUCTION: Uncomment below when using paid API to get current season data
    // { leagueId: 39, season: 2024 }, // Premier League 2024-25
];
const API_ENDPOINT = `https://${API_FOOTBALL_HOST}/fixtures`;
// ---------------------

// --- Helper Functions ---

// Function to parse gameweek number from the round string
function parseGameweekNumber(roundString: string | undefined | null): number | null {
    if (!roundString) return null;
    const roundMatch = roundString.match(/(\d+)$/);
    if (roundMatch?.[1]) {
        const num = parseInt(roundMatch[1], 10);
        return isNaN(num) ? null : num;
    }
    return null; // Return null if no number is found
}

// Function to map API fixture to DB FixtureInsert schema
function mapApiFixtureToDb(
    apiFixture: ApiFootballFixture,
    gameweekIdMap: Map<string, string> // Map key: "leagueId-season-gameweekNum", value: gameweekUUID
): FixtureInsert | null {

    const leagueId = apiFixture.league?.id;
    const season = apiFixture.league?.season;
    const gameweekNumber = parseGameweekNumber(apiFixture.league?.round);

    // Basic validation
    if (!apiFixture.fixture?.id || !leagueId || !season || gameweekNumber === null || !apiFixture.teams?.home?.id || !apiFixture.teams?.away?.id) {
        console.warn(`Skipping fixture ${apiFixture.fixture?.id} due to missing essential data (league, season, gameweek#, teams).`);
        return null;
    }

    // Find the corresponding gameweek UUID from the map
    const mapKey = `${leagueId}-${season}-${gameweekNumber}`;
    const gameweekId = gameweekIdMap.get(mapKey);

    if (!gameweekId) {
        console.warn(`Skipping fixture ${apiFixture.fixture?.id}: Could not find corresponding gameweek ID in map for key ${mapKey}. Ensure gameweeks were processed first.`);
        return null; // Skip if we can't find the gameweek link
    }

    // Convert scores
    const homeScore = apiFixture.goals?.home !== null ? Number(apiFixture.goals?.home) : null;
    const awayScore = apiFixture.goals?.away !== null ? Number(apiFixture.goals?.away) : null;

    return {
        external_id: Number(apiFixture.fixture.id),
        league_id: Number(leagueId),
        season: Number(season),
        // Removed 'round' and 'gameweek' number columns
        gameweek_id: gameweekId, // Use the UUID foreign key
        home_team: apiFixture.teams.home.name,
        away_team: apiFixture.teams.away.name,
        home_team_id: Number(apiFixture.teams.home.id),
        away_team_id: Number(apiFixture.teams.away.id),
        kickoff_time: apiFixture.fixture.date, // API-Football uses ISO 8601 format
        status: apiFixture.fixture.status?.short,
        home_score: homeScore,
        away_score: awayScore,
        results_processed: false, // Default to not processed
    };
}
// ------------------------


// --- Main Population Function ---
async function populateFixtures() {
    console.log('Starting fixture and gameweek population...');

    const allApiFixtures: ApiFootballFixture[] = [];

    // 1. Fetch all fixtures from API for configured leagues/seasons
    for (const { leagueId, season } of LEAGUES_TO_FETCH) {
        console.log(`Fetching fixtures from API for League ${leagueId}, Season ${season}...`);
        try {
            const response = await axios.get<{ response: ApiFootballFixture[] }>(API_ENDPOINT, {
                params: { league: leagueId, season },
                headers: {
                    'x-rapidapi-key': API_FOOTBALL_KEY,
                    'x-rapidapi-host': API_FOOTBALL_HOST,
                },
                timeout: 30000 // Add timeout
            });

            if (response.data?.response && Array.isArray(response.data.response)) {
                const fixtures = response.data.response;
                console.log(`Received ${fixtures.length} fixtures from API for League ${leagueId}.`);
                allApiFixtures.push(...fixtures);
            } else {
                console.warn(`No fixtures data found in API response for League ${leagueId}.`);
            }
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? `Status ${error.response?.status}: ${JSON.stringify(error.response?.data) || error.message}`
                : (error instanceof Error ? error.message : String(error));
            console.error(`Error fetching fixtures for League ${leagueId}: ${message}`);
            // Optionally decide whether to continue or exit if API fetch fails
            // process.exit(1);
        }
    }

    if (allApiFixtures.length === 0) {
        console.log('No fixtures fetched from API. Exiting.');
        return;
    }
    console.log(`Total fixtures fetched from API: ${allApiFixtures.length}`);

    // 2. Process and Upsert Gameweeks
    console.log('Processing gameweeks from fixture data...');
    const gameweeksToUpsertMap = new Map<string, GameweekInsert>();

    for (const apiFixture of allApiFixtures) {
        const leagueId = apiFixture.league?.id;
        const season = apiFixture.league?.season;
        const gameweekNumber = parseGameweekNumber(apiFixture.league?.round);
        const kickoffTime = apiFixture.fixture?.date; // ISO String

        if (leagueId && season && gameweekNumber !== null && kickoffTime) {
            const mapKey = `${leagueId}-${season}-${gameweekNumber}`;
            const existingEntry = gameweeksToUpsertMap.get(mapKey);
            const currentKickoff = new Date(kickoffTime).getTime();

            if (!existingEntry || currentKickoff < new Date(existingEntry.deadline_time).getTime()) {
                // If it's the first fixture for this gameweek or earlier than the current earliest, update/add
                gameweeksToUpsertMap.set(mapKey, {
                    league_id: leagueId,
                    season: season,
                    gameweek_number: gameweekNumber,
                    name: `Gameweek ${gameweekNumber}`, // Or use apiFixture.league.round if preferred
                    deadline_time: kickoffTime, // Store the earliest kickoff time as deadline
                    // Default flags (can be updated later by another script)
                    is_previous: false,
                    is_current: false,
                    is_next: false,
                    finished: false,
                    data_updated_at: new Date().toISOString(), // Mark when we processed it
                });
            }
        }
    }

    const gameweeksToUpsert = Array.from(gameweeksToUpsertMap.values());

    if (gameweeksToUpsert.length === 0) {
        console.log('No valid gameweek data derived from fixtures.');
        // Decide if you should stop here or proceed with fixtures anyway (maybe risky)
        return;
    }

    console.log(`Attempting to upsert ${gameweeksToUpsert.length} gameweeks into Supabase...`);
    const { data: upsertedGameweeksData, error: gameweekUpsertError } = await supabase
        .from('gameweeks')
        .upsert(gameweeksToUpsert, {
            onConflict: 'league_id, season, gameweek_number', // Use composite key for conflict resolution
            // ignoreDuplicates: false // default is false, ensures updates happen
        })
        .select('id, league_id, season, gameweek_number'); // Select needed fields including the id

    if (gameweekUpsertError) {
        console.error('Error upserting gameweeks:', gameweekUpsertError);
        // Decide if you should stop here
        return;
    }

    if (!upsertedGameweeksData || upsertedGameweeksData.length !== gameweeksToUpsert.length) {
         console.warn(`Gameweek upsert might have been partial. Expected ${gameweeksToUpsert.length}, got ${upsertedGameweeksData?.length ?? 0} results.`);
         // Continue cautiously or stop, depending on requirements
         if (!upsertedGameweeksData) return; // Stop if data is null
    }

    console.log(`Successfully upserted/verified ${upsertedGameweeksData.length} gameweeks.`);

    // 3. Create Gameweek Lookup Map (using upserted data to get IDs)
    const gameweekIdMap = new Map<string, string>(); // Key: "leagueId-season-gameweekNum", Value: gameweekUUID
    for (const gw of upsertedGameweeksData) {
        if (gw.id && gw.league_id && gw.season && gw.gameweek_number !== null) {
             const mapKey = `${gw.league_id}-${gw.season}-${gw.gameweek_number}`;
             gameweekIdMap.set(mapKey, gw.id);
        }
    }
    console.log(`Created gameweek lookup map with ${gameweekIdMap.size} entries.`);


    // 4. Map API Fixtures to DB Schema (using the gameweekIdMap)
    console.log('Mapping API fixtures to database schema with gameweek links...');
    const allDbFixtures = allApiFixtures
        .map(apiFix => mapApiFixtureToDb(apiFix, gameweekIdMap))
        .filter((f): f is FixtureInsert => f !== null); // Type guard to filter out nulls


    if (allDbFixtures.length === 0) {
        console.log('No valid fixtures could be mapped to the database schema. Exiting.');
        return;
    }
    console.log(`Successfully mapped ${allDbFixtures.length} fixtures for database insertion/update.`);


    // 5. Insert/Update Fixtures into Supabase (using existing logic but with new structure)
    console.log('Fetching existing fixtures from database for comparison...');
    const { data: existingDbFixtures, error: fetchExistingError } = await supabase
      .from('fixtures')
      .select('id, external_id') // Select needed fields
      .in('season', LEAGUES_TO_FETCH.map(l => l.season)) // Filter by seasons being processed
      .in('league_id', LEAGUES_TO_FETCH.map(l => l.leagueId)); // Filter by leagues being processed

    if (fetchExistingError) {
      console.error('Error fetching existing fixtures:', fetchExistingError);
      return;
    }

    const existingExternalIds = new Set(existingDbFixtures?.map(f => f.external_id) || []);

    // Split fixtures into inserts and updates
    const fixturesToInsert = allDbFixtures.filter(f => !existingExternalIds.has(f.external_id));
    const fixturesToUpdate = allDbFixtures
        .filter(f => existingExternalIds.has(f.external_id))
        .map(f => ({
             ...f,
             // id: existingIdMap.get(f.external_id)!, // Ensure id is included for update/upsert **Supabase upsert handles this via onConflict**
        }));

    // Perform Inserts
    if (fixturesToInsert.length > 0) {
      console.log(`Inserting ${fixturesToInsert.length} new fixtures...`);
      const { error: insertError } = await supabase
        .from('fixtures')
        .insert(fixturesToInsert);

      if (insertError) {
        console.error('Error inserting fixtures:', insertError);
      } else {
        console.log(`Successfully inserted ${fixturesToInsert.length} fixtures.`);
      }
    } else {
        console.log('No new fixtures to insert.');
    }

    // Perform Updates (using Upsert for simplicity and atomicity)
    if (fixturesToUpdate.length > 0) {
        console.log(`Upserting ${fixturesToUpdate.length} existing fixtures...`);
        // Use upsert with external_id as the conflict target
        // Ensure 'external_id' has a UNIQUE constraint in your fixtures table for this to work reliably
        const { error: updateError } = await supabase
          .from('fixtures')
          .upsert(fixturesToUpdate, {
             onConflict: 'external_id', // Specify the column Supabase uses to detect conflict
             ignoreDuplicates: false // Ensure records are updated if conflict occurs
          });

        if (updateError) {
            console.error('Error upserting/updating fixtures:', updateError);
        } else {
            console.log(`Successfully upserted/updated ${fixturesToUpdate.length} fixtures.`);
        }
    } else {
         console.log('No existing fixtures to update.');
    }

    console.log('Fixture population process completed.');
}
// -----------------------------


// --- Run the Main Function ---
populateFixtures().catch(err => {
    console.error("Unhandled error during script execution:", err);
    process.exit(1); // Exit with error code
});
// ---------------------------
