// API route for handling user picks

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from 'lib/types/supabase';
import { pickServices } from 'lib/db/services/pickService/pickService';
import { PickError } from 'lib/types/pick';
import { createApiRouteCookieMethods } from 'lib/utils/supabaseServerHelpers/supabaseServerHelpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Allow both GET (fetch pick) and POST (save pick) requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create Supabase client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: createApiRouteCookieMethods(req, res) }
    );
    // Get user from session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = session.user.id;

    // Handle GET request to fetch a pick
    if (req.method === 'GET') {
      const { roundId } = req.query;
      
      if (!roundId || typeof roundId !== 'string') {
        return res.status(400).json({ error: 'Round ID is required' });
      }

      console.log(`Fetching pick for user ${userId}, round ${roundId}`);
      const response = await pickServices.findUserPickForRound(supabase, userId, roundId);
      
      if (response.error) {
        console.error('Error fetching pick:', response.error);
        let statusCode = 500;
        if (response.error instanceof PickError) {
          switch(response.error.code) {
            case 'NOT_FOUND': statusCode = 404; break;
            case 'VALIDATION_ERROR': statusCode = 400; break;
            case 'DATABASE_ERROR': statusCode = 500; break;
            default: statusCode = 500;
          }
        }
        return res.status(statusCode).json({ error: response.error.message });
      }

      return res.status(200).json(response.data);
    }
    
    // Handle POST request to save a pick
    if (req.method === 'POST') {
      // Check if this is a batch request or a single pick request
      if (req.body.picks && Array.isArray(req.body.picks)) {
        // Handle batch request
        const { picks } = req.body;
        
        if (picks.length === 0) {
          return res.status(400).json({ error: 'No picks provided' });
        }

        console.log(`Processing batch of ${picks.length} picks for user ${userId}`);
        
        // Process each pick and track results
        const results = [];
        
        for (const pick of picks) {
          const { roundId, teamId, isExternalId = true } = pick;
          
          if (!roundId || !teamId) {
            results.push({
              roundId: roundId || 'unknown',
              success: false,
              error: 'Round ID and Team ID are required'
            });
            continue;
          }

          try {
            // Check if the round's gameweek is finished or deadline passed
            const { data: roundData, error: roundError } = await supabase
              .from('rounds')
              .select('gameweek_id')
              .eq('id', roundId)
              .single();

            if (roundError) {
              results.push({
                roundId,
                success: false, 
                error: 'Round not found'
              });
              continue;
            }

            if (roundData?.gameweek_id) {
              // Check gameweek status
              const { data: gameweekData, error: gameweekError } = await supabase
                .from('gameweeks')
                .select('finished, deadline_time')
                .eq('id', roundData.gameweek_id)
                .single();

              if (gameweekError) {
                results.push({
                  roundId,
                  success: false,
                  error: 'Failed to check gameweek status'
                });
                continue;
              }

              if (gameweekData?.finished) {
                results.push({
                  roundId,
                  success: false,
                  error: 'Cannot make picks for a finished gameweek'
                });
                continue;
              }

              if (gameweekData?.deadline_time && new Date(gameweekData.deadline_time) < new Date()) {
                results.push({
                  roundId,
                  success: false,
                  error: 'Cannot make picks after deadline has passed'
                });
                continue;
              }
            }

            // Save the pick
            const response = await pickServices.saveUserPick(
              supabase, 
              userId, 
              roundId, 
              teamId.toString(),
              isExternalId
            );
            
            if (response.error) {
              results.push({
                roundId,
                success: false,
                error: response.error.message
              });
            } else {
              results.push({
                roundId,
                success: true,
                data: response.data
              });
            }
          } catch (err) {
            results.push({
              roundId,
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        }

        // Count successes and errors
        const successResults = results.filter(r => r.success);
        const errorResults = results.filter(r => !r.success);

        return res.status(200).json({
          success: true,
          successCount: successResults.length,
          errorCount: errorResults.length,
          results: results
        });
      } else {
        // Handle single pick request
        const { roundId, teamId, isExternalId = true } = req.body;
        
        if (!roundId || typeof roundId !== 'string') {
          return res.status(400).json({ error: 'Round ID is required' });
        }
        
        if (!teamId || (typeof teamId !== 'string' && typeof teamId !== 'number')) {
          return res.status(400).json({ error: 'Team ID is required' });
        }

        console.log(`Saving pick for user ${userId}, round ${roundId}, team ${teamId} (${isExternalId ? 'external ID' : 'internal UUID'})`);

        // Check if the round's gameweek is finished or deadline passed
        const { data: roundData, error: roundError } = await supabase
          .from('rounds')
          .select('gameweek_id')
          .eq('id', roundId)
          .single();

        if (roundError) {
          console.error('Error fetching round:', roundError);
          return res.status(404).json({ error: 'Round not found' });
        }

        if (roundData?.gameweek_id) {
          // Check gameweek status
          const { data: gameweekData, error: gameweekError } = await supabase
            .from('gameweeks')
            .select('finished, deadline_time')
            .eq('id', roundData.gameweek_id)
            .single();

          if (gameweekError) {
            console.error('Error fetching gameweek status:', gameweekError);
            return res.status(500).json({ error: 'Failed to check gameweek status' });
          }

          if (gameweekData?.finished) {
            return res.status(403).json({ 
              error: 'Cannot make picks for a finished gameweek',
              code: 'GAMEWEEK_FINISHED'
            });
          }

          if (gameweekData?.deadline_time && new Date(gameweekData.deadline_time) < new Date()) {
            return res.status(403).json({ 
              error: 'Cannot make picks after deadline has passed',
              code: 'DEADLINE_PASSED'
            });
          }
        }

        const response = await pickServices.saveUserPick(
          supabase, 
          userId, 
          roundId, 
          teamId.toString(),
          isExternalId
        );
        
        if (response.error) {
          console.error('Error saving pick:', response.error);
          let statusCode = 500;
          const errorMessage = response.error.message;
          
          if (response.error instanceof PickError) {
            switch(response.error.code) {
              case 'NOT_FOUND': statusCode = 404; break;
              case 'VALIDATION_ERROR': statusCode = 400; break;
              case 'DATABASE_ERROR': statusCode = 500; break;
              // Handle specialised pick errors (if implemented in service)
              case 'PICK_LOCKED': statusCode = 400; break;
              case 'ALREADY_PICKED_TEAM_THIS_COMP': statusCode = 400; break;
              default: statusCode = 500;
            }
          }
          
          return res.status(statusCode).json({ error: errorMessage });
        }

        return res.status(200).json(response.data);
      }
    }
  } catch (error: unknown) {
    console.error('Unexpected error in picks API handler:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
} 