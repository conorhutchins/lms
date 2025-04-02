import { supabase } from '../../db';
// Import generated types
import { Database } from '../../types/supabase';

// Define helper types based on generated ones
type Competition = Database['public']['Tables']['competitions']['Row'];
type Round = Database['public']['Tables']['rounds']['Row'];
type CompetitionCreateData = Database['public']['Tables']['competitions']['Insert'];

// Extend Competition type to potentially include related rounds
type CompetitionWithRounds = Competition & {
  rounds: Round[];
};

// Object that contains all the methods for the competition service
export const competitionServices = {
  // Use id to find the competition
  async findCompetitionById(id: string): Promise<CompetitionWithRounds | null> { // Use string for UUID
    const { data, error } = await supabase
      .from('competitions')
      .select('*, rounds(*)') // Select related rounds
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching competition by id:', error);
      return null;
    }

    // Ensure the structure matches CompetitionWithRounds
    // Supabase might return rounds as null if none exist
    return data ? { ...data, rounds: data.rounds || [] } : null;
  },

  async findActiveCompetitions(): Promise<CompetitionWithRounds[]> {
    // Find all competitions that are active
    const { data, error } = await supabase
      .from('competitions')
      .select('*, rounds(*)') // Select related rounds
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching active competitions:', error);
      return [];
    }

    // Ensure each competition has a rounds array
    return data?.map(comp => ({ ...comp, rounds: comp.rounds || [] })) || [];
  },

  // Insert a new competition into the database
  async createCompetition(competitionData: CompetitionCreateData): Promise<Competition | null> {
    const { data, error } = await supabase
      .from('competitions')
      .insert([competitionData])
      .select()
      .single();

    if (error) {
      console.error('Error creating competition:', error);
      return null;
    }

    return data;
  },

  // Additional methods can be added here
};
