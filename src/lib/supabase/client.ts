import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../../lib/types/supabase'; // Corrected path

// Modified to accept and pass the Database generic
export function createClient<Db = Database>() {
  // Create a supabase client on the browser with project's credentials
  return createBrowserClient<Db>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 