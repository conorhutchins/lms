// API endpoint for looking up team names by ID
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { createApiRouteCookieMethods } from '../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import { Database } from '../../../lib/types/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the team ID from the query parameters
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid team ID' });
  }

  try {
    // Create Supabase client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: createApiRouteCookieMethods(req, res) }
    );

    // First try to find by internal ID
    let { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, name, external_api_id')
      .eq('id', id)
      .maybeSingle();

    // If not found by internal ID, try external ID
    if (!teamData && !teamError) {
      console.log(`Team not found by internal ID ${id}, trying external ID`);
      const { data: externalTeamData, error: externalTeamError } = await supabase
        .from('teams')
        .select('id, name, external_api_id')
        .eq('external_api_id', id)
        .maybeSingle();

      if (externalTeamError) {
        console.error('Error looking up team by external ID:', externalTeamError);
        return res.status(500).json({ error: 'Database error looking up team' });
      }

      teamData = externalTeamData;
    } else if (teamError) {
      console.error('Error looking up team by internal ID:', teamError);
      return res.status(500).json({ error: 'Database error looking up team' });
    }

    // If team is not found by either ID
    if (!teamData) {
      console.log(`Team not found with ID ${id} (either internal or external)`);
      return res.status(404).json({ error: 'Team not found' });
    }

    // Return the team data
    return res.status(200).json({
      id: teamData.id,
      name: teamData.name,
      external_api_id: teamData.external_api_id
    });

  } catch (error) {
    console.error('Unexpected error in teams/lookup API:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
} 