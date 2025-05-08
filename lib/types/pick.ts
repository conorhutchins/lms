// Define types for pick-related data

import { Database } from './supabase';

// Basic Pick type derived from Supabase schema
export type Pick = Database['public']['Tables']['picks']['Row'];

// Pick with additional information (could be expanded as needed)
export type PickWithTeam = Pick & {
  team_name: string;
};

// define the status options of a pick
export enum PickStatus {
  PENDING = 'pending',
  WIN = 'win',
  LOSS = 'loss',
  DRAW = 'draw',
  VOID = 'void',
  LOCKED = 'locked',
  ELIMINATED = 'eliminated'
} 