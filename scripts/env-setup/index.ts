import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// sets up environment variables needed for database connections and has to be called before any module that uses those environment variables
export function setupEnvironment(): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, '../../.env.local'); // Go up two levels: utils -> scripts -> project_root
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Extract Supabase values
    const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
    const supabaseKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

    if (!supabaseUrlMatch || !supabaseKeyMatch) {
      console.error('Supabase credentials not found in .env.local');
      process.exit(1);
    }

    // Set environment variables that will be used by the Supabase client in lib/db.js
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrlMatch[1];
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseKeyMatch[1];
    
    console.log('Environment setup complete.');
  } catch (error) {
    console.error(`Failed to load environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
} 