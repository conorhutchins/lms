import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/db';

/* all that this is doing is fetching the fixtures from the database
it sets up a route /api/fixtures and then it gets the fixtures from the database */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Using supabase client instead of pool
      const { data, error } = await supabase
        .from('fixtures')
        .select('*');
        
      if (error) throw error;
      
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching fixtures:', error);
      return res.status(500).json({ error: 'Failed to fetch fixtures' });
    }
  }
  
  // Handle other HTTP methods
  return res.status(405).json({ error: 'Method not allowed' });
}