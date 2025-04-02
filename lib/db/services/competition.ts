import { Competition } from '../../types/competition';
import { supabase } from '../../db';

// No need for Prisma's Decimal type with Supabase
type CompetitionCreateData = {
  title: string;
  entry_fee: number; 
  start_date: Date;
  status: string;
  prize_pot: number;
  rolled_over?: boolean;
};

// Object that contains all the methods for the competition service
export const competitionServices = {
  // Use id to find the competition
  async findCompetitionById(id: number): Promise<Competition | null> {
    const { data, error } = await supabase
      .from('competitions')
      .select('*, rounds(*)')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching competition:', error);
      return null;
    }
    
    return data;
  },
  
  async findActiveCompetitions(): Promise<Competition[]> {
    // Find all competitions that are active
    const { data, error } = await supabase
      .from('competitions')
      .select('*, rounds(*)')
      .eq('status', 'active');
      
    if (error) {
      console.error('Error fetching active competitions:', error);
      return [];
    }
    
    return data || [];
  },
  
  // Insert a new competition into the database
  async createCompetition(data: CompetitionCreateData): Promise<Competition | null> {
    const { data: newCompetition, error } = await supabase
      .from('competitions')
      .insert([data])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating competition:', error);
      return null;
    }
    
    return newCompetition;
  },
  
  // Additional methods
};