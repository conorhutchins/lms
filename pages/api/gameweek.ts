import type { NextApiRequest, NextApiResponse } from 'next'
import pool from '../../lib/db'
import axios from 'axios'
import { Event } from '../../types/apiTypes'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
if (req.method === 'GET') {
    try {

        // taking the current gameweek from the FPL API
        const response = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/')
        const data = response.data
        console.log(data.events)
        //grabbing the id current gameweek and store it in a const
        const currentGameweek = (data.events as Event[]).find((event) => event.is_current)?.id;

        // if no current gameweek return a 404
        if (!currentGameweek) {
            return res.status(404).json({ message: 'No current gameweek not found' })
        }
        
        // put it into my database
        await pool.query(`
    
            INSERT INTO gameweek (current_gameweek) VALUES ($1)
            ON CONFLICT (id) DO UPDATE SET current_gameweek = $1
        `, [currentGameweek]);

        res.status(200).json({ message: 'Gameweek updated successfully', currentGameweek })
    } catch (error) {
        console.error('Error fetching gameweek:', error)
        res.status(500).json({ error: (error as Error).message })
    }
    } else {
        // restrict to only get requests
        res.setHeader('Allow', ['GET'])
        // if not a get request inform the user
        res.status(405).json({ message: `Method ${req.method} Not Allowed` })
}
}