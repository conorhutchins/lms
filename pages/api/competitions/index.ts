import type { NextApiRequest, NextApiResponse } from 'next';
import { competitionServices } from '../../../lib/db/services/competition';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const competitions = await competitionServices.findActiveCompetitions();
      return res.status(200).json(competitions);
    } catch (error) {
      console.error('Error fetching competitions:', error);
      return res.status(500).json({ error: 'Failed to fetch competitions' });
    }
  }
  
  // Handle other HTTP methods
  return res.status(405).json({ error: 'Method not allowed' });
} 