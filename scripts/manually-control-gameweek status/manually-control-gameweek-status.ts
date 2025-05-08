// script for testing purposes to reset gameweek status in competition table on supabase it opens as a cli tool
// it allows you to reset all gameweeks to default state, set a specific gameweek as current, run the full realistic status calculation, reset all gameweeks to "upcoming" for testing, and setup next 5 gameweeks for testing
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/types/supabase';
import { config } from 'dotenv'; // loads env variables from .env.local or .env file
import path from 'path'; // for file path operations
import { fileURLToPath } from 'url'; // for file path operations
import fs from 'fs'; // for file operations
import readline from 'readline'; // for user input

// Load environment variables with absolute path
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '../..');
  
  // Try loading from .env.local first 
  const envLocalPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    console.log(`Loading environment from: ${envLocalPath}`);
    config({ path: envLocalPath });
  } else {
    // Fall back to .env 
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

// Initialise Supabase client with service role key for admin access
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Using the service role key for admin access
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask user what they want to do
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Reset all gameweeks to default state (no current, next, or previous)
async function resetAllGameweekStatuses(leagueId: number, season: number) {
  console.log(`Resetting all gameweek statuses for league ${leagueId}, season ${season}...`);
  
  const { error } = await supabase
    .from('gameweeks')
    .update({
      is_current: false,
      is_next: false,
      is_previous: false,
      finished: false,
      data_updated_at: new Date().toISOString()
    })
    .eq('league_id', leagueId)
    .eq('season', season);
  
  if (error) {
    console.error('Error resetting gameweek statuses:', error);
    return false;
  }
  
  console.log('All gameweek statuses reset successfully');
  return true;
}

// Set a specific gameweek as current
async function setCurrentGameweek(leagueId: number, season: number, gameweekNumber: number) {
  console.log(`Setting gameweek ${gameweekNumber} as current...`);
  
  // First get the gameweek to make sure it exists
  const { data: gameweek, error: getError } = await supabase
    .from('gameweeks')
    .select('id, gameweek_number')
    .eq('league_id', leagueId)
    .eq('season', season)
    .eq('gameweek_number', gameweekNumber)
    .single();
  
  if (getError || !gameweek) {
    console.error(`Error finding gameweek ${gameweekNumber}:`, getError);
    return false;
  }
  
  // Now set it as current
  const { error: updateError } = await supabase
    .from('gameweeks')
    .update({
      is_current: true,
      is_next: false,
      is_previous: false,
      finished: false,
      data_updated_at: new Date().toISOString()
    })
    .eq('id', gameweek.id);
  
  if (updateError) {
    console.error('Error setting current gameweek:', updateError);
    return false;
  }
  
  console.log(`Gameweek ${gameweekNumber} set as current successfully`);
  return true;
}

// Show test menu to choose the desired action
async function showMenu() {
  console.log('\n--- Gameweek Status Testing Tool ---');
  console.log('1. Reset all gameweek statuses to default (for Premier League 2023)');
  console.log('2. Set a specific gameweek as current (for Premier League 2023)');
  console.log('3. Run full realistic status calculation based on current date');
  console.log('4. Reset all gameweeks to "upcoming" (not finished) for testing');
  console.log('5. Make next 5 gameweeks available for picks (for testing)');
  console.log('6. Exit');
  
  const choice = await question('\nChoose an option (1-6): ');
  
  switch (choice) {
    case '1':
      await resetAllGameweekStatuses(39, 2023);
      break;
    case '2':
      const gwNum = await question('Enter gameweek number (1-38): ');
      const gameweekNumber = parseInt(gwNum);
      if (isNaN(gameweekNumber) || gameweekNumber < 1 || gameweekNumber > 38) {
        console.log('Invalid gameweek number. Please enter a number between 1 and 38.');
      } else {
        await setCurrentGameweek(39, 2023, gameweekNumber);
      }
      break;
    case '3':
      // Import and run the standard update function from the other script
      const { updateGameweekStatuses } = await import('../calculate-current-gameweek/calculate-current-gameweek.js');
      await updateGameweekStatuses();
      break;
    case '4':
      await resetAllGameweeksForTesting(39, 2023);
      break;
    case '5':
      await setupNext5GameweeksForTesting(39, 2023);
      break;
    case '6':
      console.log('Exiting...');
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('Invalid choice. Please enter a number between 1 and 6.');
  }
  
  // Show menu again unless exiting
  if (choice !== '6') {
    await showMenu();
  }
}

// Reset all gameweeks to "upcoming" for testing
async function resetAllGameweeksForTesting(leagueId: number, season: number) {
  console.log(`Resetting all gameweeks to "upcoming" state for league ${leagueId}, season ${season}...`);
  
  const { error } = await supabase
    .from('gameweeks')
    .update({
      is_current: false,
      is_next: false,
      is_previous: false,
      finished: false,
      data_updated_at: new Date().toISOString()
    })
    .eq('league_id', leagueId)
    .eq('season', season);
  
  if (error) {
    console.error('Error resetting gameweeks for testing:', error);
    return false;
  }
  
  console.log('All gameweeks reset to "upcoming" state');
  return true;
}

// Setup next 5 gameweeks for testing
async function setupNext5GameweeksForTesting(leagueId: number, season: number) {
  console.log(`Setting up next 5 gameweeks for testing (league ${leagueId}, season ${season})...`);
  
  // First get all gameweeks ordered by number
  const { data: gameweeks, error: getError } = await supabase
    .from('gameweeks')
    .select('id, gameweek_number')
    .eq('league_id', leagueId)
    .eq('season', season)
    .order('gameweek_number', { ascending: true });
  
  if (getError || !gameweeks || gameweeks.length === 0) {
    console.error('Error fetching gameweeks:', getError);
    return false;
  }
  
  // First reset all gameweeks
  await resetAllGameweeksForTesting(leagueId, season);
  
  // Choose a starting point (e.g., gameweek 20)
  const startingGameweek = 20;
  const startIdx = gameweeks.findIndex(gw => gw.gameweek_number === startingGameweek);
  
  if (startIdx === -1) {
    console.error(`Gameweek ${startingGameweek} not found`);
    return false;
  }
  
  // Set current gameweek
  const currentGameweek = gameweeks[startIdx];
  await supabase
    .from('gameweeks')
    .update({
      is_current: true,
      is_next: false,
      is_previous: false,
      finished: false
    })
    .eq('id', currentGameweek.id);
  
  // Set next 4 gameweeks (if available)
  for (let i = 1; i <= 4; i++) {
    if (startIdx + i < gameweeks.length) {
      const nextGameweek = gameweeks[startIdx + i];
      await supabase
        .from('gameweeks')
        .update({
          is_current: false,
          is_next: i === 1, // Only the immediate next one gets is_next = true
          is_previous: false,
          finished: false
        })
        .eq('id', nextGameweek.id);
    }
  }
  
  // Set previous gameweek if available
  if (startIdx > 0) {
    const prevGameweek = gameweeks[startIdx - 1];
    await supabase
      .from('gameweeks')
      .update({
        is_current: false,
        is_next: false,
        is_previous: true,
        finished: true
      })
      .eq('id', prevGameweek.id);
    
    // Set all earlier gameweeks as finished
    for (let i = 0; i < startIdx - 1; i++) {
      await supabase
        .from('gameweeks')
        .update({
          is_current: false,
          is_next: false,
          is_previous: false,
          finished: true
        })
        .eq('id', gameweeks[i].id);
    }
  }
  
  console.log(`Test setup complete. Current gameweek: ${currentGameweek.gameweek_number}`);
  return true;
}

// Start the interactive menu
console.log('Starting gameweek status testing tool...');
showMenu().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
}); 