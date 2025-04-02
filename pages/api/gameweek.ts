import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/db'
import axios from 'axios'
import { Event } from '../../types/apiTypes' // type check the data coming from the FPL API

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Fetch current gameweek data from FPL API
      const response = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/')
      const data = response.data
      
      // Find current gameweek
      const currentGameweek = data.events.find((event: Event) => 
        event.is_current === true
      )
      
      if (!currentGameweek) {
        return res.status(404).json({ error: 'Current gameweek not found' })
      }
      
      // If you need to store this in your database
      const { error } = await supabase
        .from('gameweeks')
        .upsert({
          id: currentGameweek.id,
          name: currentGameweek.name,
          deadline_time: currentGameweek.deadline_time,
          is_current: currentGameweek.is_current,
          is_next: currentGameweek.is_next,
          // Add other fields as needed
        }, {
          onConflict: 'id' // Upsert based on the id column
        })
        
      if (error) throw error
      
      return res.status(200).json(currentGameweek)
    } catch (error) {
      console.error('Error fetching gameweek data:', error)
      return res.status(500).json({ error: 'Failed to fetch gameweek data' })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}