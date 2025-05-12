// Define types for pick-related data

import { Database } from './supabase';

// Basic Pick type derived from Supabase schema
export type Pick = Database['public']['Tables']['picks']['Row'];

// Pick with additional information (could be expanded as needed)
export type PickWithTeam = Pick & {
  team_name: string;
};

// Type for updating a pick
export type PickUpdate = Database['public']['Tables']['picks']['Update'];

// Ensure PickUpdate is exported

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

// Type for inserting a new pick
export type PickInsert = {
  user_id: string;
  round_id: string;
  team_id: string;
  pick_timestamp: string;
  status: PickStatus | 'pending';
};

// Utility function to convert external team IDs to internal IDs
export function convertExternalTeamIds(
  teamMappings: Array<{ external_api_id: string; id: string }>,
  externalIdStrings: string[]
): (string | null)[] {
  const teamIdMap = new Map(
    teamMappings.map(team => [team.external_api_id, team.id])
  );
  
  // Map external IDs to internal IDs, preserving original order
  return externalIdStrings.map(externalId => 
    teamIdMap.get(externalId) || null
  );
}

// Utility function to create pick objects for a round
export function createPicksForRound(
  userId: string,
  roundId: string,
  internalTeamIds: string[]
): PickInsert[] {
  return internalTeamIds.map((internalTeamId) => ({
    user_id: userId,
    round_id: roundId,
    team_id: internalTeamId,
    pick_timestamp: new Date().toISOString(),
    status: PickStatus.PENDING
  }));
}

import { ServiceError } from '../types/service';

// Error codes for pick-related operations
export type PickErrorCode = 
  | 'NOT_FOUND' 
  | 'DATABASE_ERROR' 
  | 'VALIDATION_ERROR'
  | 'PICK_LOCKED'
  | 'ALREADY_PICKED_TEAM_THIS_COMP';

// Custom error class for pick-related errors
export class PickError extends ServiceError {
  constructor(
    message: string,
    code: PickErrorCode,
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'PickError';
  }

  static notFound(message: string = 'Pick not found'): PickError {
    return new PickError(message, 'NOT_FOUND');
  }

  static databaseError(
    message: string = 'Database error in pick service', 
    originalError?: unknown
  ): PickError {
    return new PickError(message, 'DATABASE_ERROR', originalError);
  }

  static validationError(
    message: string = 'Invalid pick data'
  ): PickError {
    return new PickError(message, 'VALIDATION_ERROR');
  }

  static pickLocked(
    message: string = 'Pick is locked'
  ): PickError {
    return new PickError(message, 'PICK_LOCKED');
  }

  static alreadyPickedTeamThisComp(
    message: string = 'Team already picked in this competition'
  ): PickError {
    return new PickError(message, 'ALREADY_PICKED_TEAM_THIS_COMP');
  }
}