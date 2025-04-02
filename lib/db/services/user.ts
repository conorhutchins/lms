import { supabase } from '../../db';

export type User = {
  id: number;
  name: string | null;
  email: string;
  password_hash?: string | null;
  created_at: Date;
  updated_at: Date;
};

export type UserCreateInput = {
  name: string | null;
  email: string;
  password_hash?: string | null;
};

export const userServices = {
  async findUserById(id: number): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    return data;
  },
  
  async findUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    return data;
  },
  
  async createUser(userData: UserCreateInput): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    
    return data;
  }
};