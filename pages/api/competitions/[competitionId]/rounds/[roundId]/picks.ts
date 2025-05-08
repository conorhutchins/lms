// API route for saving picks for a specific round in a competition

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { createApiRouteCookieMethods } from '../../../../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import { Database } from '../../../../../../lib/types/supabase';
import { pickServices } from '../../../../../../lib/db/services/pickService';
import { ensureUserHasJoinedCompetition } from '../../../../../../lib/utils/supabaseServerHelpers/competition';

// API route handler function
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
// take the IDs from the URL params
  const { competitionId, roundId } = req.query;
  // take the selected teams from the request body
  const { selectedTeamIds } = req.body;
// ensure the IDs are strings
  if (typeof competitionId !== 'string' || typeof roundId !== 'string') {
    return res.status(400).json({ error: 'Invalid competition or round ID' });
  }

  // Validate that selectedTeamIds is an array and not empty
  if (!Array.isArray(selectedTeamIds) || selectedTeamIds.length === 0) {
    return res.status(400).json({ error: 'No team IDs selected' });
  }
  
  try {
    // Create Supabase client with auth context
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: createApiRouteCookieMethods(req, res) }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
// require authenticated user
    if (userError || !user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // make sure the user has joined the competition
    const hasJoined = await ensureUserHasJoinedCompetition(supabase, user.id, competitionId);
    
    if (!hasJoined) {
      return res.status(403).json({ error: 'You must join this competition before making picks' });
    }

    try {
      // Use the service method to convert all external team IDs in one batch
      const internalTeamIds = await pickServices.convertExternalTeamIds(supabase, selectedTeamIds);

    //  Ensure convertExternalTeamIds throws if it can't find a team
      const validInternalTeamIds: string[] = [];
      const failedConversionIndices: number[] = [];

      internalTeamIds.forEach((id, index) => {
        if (id) {
          validInternalTeamIds.push(id);
        } else {
          failedConversionIndices.push(index);
        }
      });

      if (failedConversionIndices.length > 0) {
        const missingExternalIds = failedConversionIndices.map(i => selectedTeamIds[i]).join(', ');
        return res.status(400).json({ error: `Could not find the following team IDs: ${missingExternalIds}` });
      }
      
      // Create picks objects using the service method
      const picksToSave = pickServices.createPicksForRound(
        user.id,
        roundId,
        validInternalTeamIds 
      );
      
      // Save the picks
      const saveResponse = await pickServices.savePicks(supabase, user.id, competitionId, roundId, picksToSave);
      
      // handle errors
      if (saveResponse.error) {
        console.error('Error saving picks:', saveResponse.error);
        return res.status(500).json({
          error: saveResponse.error.message || 'Failed to save picks'
        });
      }
      
      // return the success response with the saved picks
      return res.status(200).json({
        success: true,
        message: 'Picks saved successfully',
        picks: saveResponse.data
      });
    } catch (error) {
      // This handles errors from team ID conversion and pick creation
      console.error('Error processing picks:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      return res.status(400).json({ error: message });
    }

  } catch (error) {
    console.error('Unexpected error in save picks API:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return res.status(500).json({ error: message });
  }
} 