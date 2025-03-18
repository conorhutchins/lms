import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/db';

/* all that this is doing is fetching the fixtures from the database
it sets up a route /api/fixtures and then it gets the fixtures from the database
*/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM fixtures');
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
