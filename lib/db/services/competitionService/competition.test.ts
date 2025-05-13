/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Supabase mock types are intentionally simplified for testing
import { competitionServices, CompetitionError } from './competition';
import { createMockSupabase, createSuccessResponse, createErrorResponse } from '../../../test-utils/supabase-mock';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../types/supabase';

describe('competitionServices', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    jest.clearAllMocks();
  });

  // ---- STATIC TEST DATA ----
  const STATIC_COMPETITION = {
    id: 'comp-123',
    title: 'Test Competition',
    status: 'active',
    start_date: '2025-05-13T10:40:17.207s',
    created_at: '2025-05-13T10:40:17.207s',
    entry_fee: 10,
    prize_pot: 1000,
    rolled_over: false,
    sport: 'football',
    description: null
  };

  const STATIC_COMPETITION_2 = {
    id: 'comp-456',
    title: 'Second Competition',
    status: 'active',
    start_date: '2025-05-13T10:40:17.207s',
    created_at: '2025-05-13T10:40:17.207s',
    entry_fee: 0,
    prize_pot: 500,
    rolled_over: false,
    sport: 'football',
    description: 'A second test competition'
  };

  const STATIC_ROUND = {
    id: 'round-123',
    competition_id: 'comp-123',
    title: 'Round 1',
    deadline: '2025-06-01T23:59:59.000s',
    status: 'upcoming',
    created_at: '2025-05-13T10:40:17.207s'
  };

  describe('findCompetitionById', () => {
    it('should return a competition with rounds when found', async () => {
      // Mock Supabase response
      // @ts-ignore - using simplified mock implementation
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createSuccessResponse({
                  ...STATIC_COMPETITION,
                  rounds: [STATIC_ROUND]
                })
              )
            };
          })
        };
      });

      const result = await competitionServices.findCompetitionById(
        mockSupabase as unknown as SupabaseClient<Database>,
        'comp-123'
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.data?.id).toBe('comp-123');
      expect(result.data?.rounds).toHaveLength(1);
      expect(result.data?.rounds[0].id).toBe('round-123');
    });

    it('should handle database errors', async () => {
      // Mock a database error
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createErrorResponse({
                  message: 'Database error',
                  code: 'INTERNAL_ERROR'
                })
              )
            };
          })
        };
      });

      const result = await competitionServices.findCompetitionById(
        mockSupabase as unknown as SupabaseClient<Database>,
        'comp-123'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(CompetitionError);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });

    it('should handle not found errors', async () => {
      // Mock a not found scenario (null data with no error)
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createSuccessResponse(null)
              )
            };
          })
        };
      });

      const result = await competitionServices.findCompetitionById(
        mockSupabase as unknown as SupabaseClient<Database>,
        'nonexistent-id'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(CompetitionError);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toContain('nonexistent-id');
    });
  });

  describe('findActiveCompetitions', () => {
    it('should return active competitions with their rounds', async () => {
      // Mock Supabase response for multiple competitions
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockResolvedValueOnce(
            createSuccessResponse([
              { ...STATIC_COMPETITION, rounds: [STATIC_ROUND] },
              { ...STATIC_COMPETITION_2, rounds: [] }
            ])
          )
        };
      });

      const result = await competitionServices.findActiveCompetitions(
        mockSupabase as unknown as SupabaseClient<Database>
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].rounds).toHaveLength(1);
      expect(result.data?.[1].rounds).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock a database error
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockResolvedValueOnce(
            createErrorResponse({
              message: 'Database error',
              code: 'INTERNAL_ERROR'
            })
          )
        };
      });

      const result = await competitionServices.findActiveCompetitions(
        mockSupabase as unknown as SupabaseClient<Database>
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(CompetitionError);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });

    it('should return empty array when no competitions are found', async () => {
      // Mock empty data array
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockResolvedValueOnce(
            createSuccessResponse([])
          )
        };
      });

      const result = await competitionServices.findActiveCompetitions(
        mockSupabase as unknown as SupabaseClient<Database>
      );

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('createCompetition', () => {
    it('should create a competition successfully', async () => {
      // Competition data for creation
      const competitionData = {
        title: 'New Competition',
        entry_fee: 15,
        sport: 'football',
        status: 'active',
        start_date: '2025-05-13T10:40:17.207s'
      };

      // Mock Supabase insert and select response
      mockSupabase.from('competitions').insert.mockImplementationOnce(() => {
        return {
          select: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createSuccessResponse({
                  ...competitionData,
                  id: 'new-comp-id',
                  created_at: '2025-05-13T10:40:17.207s',
                  prize_pot: 0,
                  rolled_over: false
                })
              )
            };
          })
        };
      });

      const result = await competitionServices.createCompetition(
        mockSupabase as unknown as SupabaseClient<Database>,
        competitionData as any
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.data?.id).toBe('new-comp-id');
      expect(result.data?.title).toBe('New Competition');
    });

    it('should validate competition data before creation', async () => {
      // Invalid competition data (missing title)
      const invalidData = {
        entry_fee: 15,
        sport: 'football'
      };

      const result = await competitionServices.createCompetition(
        mockSupabase as unknown as SupabaseClient<Database>,
        invalidData as any
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(CompetitionError);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('title is required');
      
      // Verify that insert was not called
      expect(mockSupabase.from).toHaveBeenCalledTimes(0);
    });

    it('should handle database errors during creation', async () => {
      const competitionData = {
        title: 'Failed Competition',
        entry_fee: 15,
        sport: 'football'
      };

      // Mock database error during insert
      mockSupabase.from('competitions').insert.mockImplementationOnce(() => {
        return {
          select: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createErrorResponse({
                  message: 'Database constraint violation',
                  code: 'CONFLICT'
                })
              )
            };
          })
        };
      });

      const result = await competitionServices.createCompetition(
        mockSupabase as unknown as SupabaseClient<Database>,
        competitionData as any
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(CompetitionError);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });
  });

  describe('checkIfCompetitionEntryRequiresPayment', () => {
    it('should identify competition with entry fee as paid entry', async () => {
      // Mock Supabase response for paid competition
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createSuccessResponse({ entry_fee: 10 })
              )
            };
          })
        };
      });

      const result = await competitionServices.checkIfCompetitionEntryRequiresPayment(
        mockSupabase as unknown as SupabaseClient<Database>,
        'comp-123'
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.data?.paymentType).toBe('paid_entry');
      expect(result.data?.entryFee).toBe(10);
    });

    it('should identify competition with zero entry fee as free entry', async () => {
      // Mock Supabase response for free competition
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createSuccessResponse({ entry_fee: 0 })
              )
            };
          })
        };
      });

      const result = await competitionServices.checkIfCompetitionEntryRequiresPayment(
        mockSupabase as unknown as SupabaseClient<Database>,
        'free-comp'
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.data?.paymentType).toBe('free_entry');
      expect(result.data?.entryFee).toBe(0);
    });

    it('should handle null entry fee as free entry', async () => {
      // Mock Supabase response with null entry fee
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createSuccessResponse({ entry_fee: null })
              )
            };
          })
        };
      });

      const result = await competitionServices.checkIfCompetitionEntryRequiresPayment(
        mockSupabase as unknown as SupabaseClient<Database>,
        'null-fee-comp'
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.data?.paymentType).toBe('free_entry');
      expect(result.data?.entryFee).toBe(0);
    });

    it('should handle not found competition', async () => {
      // Mock Supabase not found error
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createErrorResponse({
                  message: 'No rows found',
                  code: 'PGRST116'
                })
              )
            };
          })
        };
      });

      const result = await competitionServices.checkIfCompetitionEntryRequiresPayment(
        mockSupabase as unknown as SupabaseClient<Database>,
        'nonexistent-id'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(CompetitionError);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should handle general database errors', async () => {
      // Mock general database error
      mockSupabase.from('competitions').select.mockImplementationOnce(() => {
        return {
          eq: jest.fn().mockImplementationOnce(() => {
            return {
              single: jest.fn().mockResolvedValueOnce(
                createErrorResponse({
                  message: 'Connection error',
                  code: 'CONNECTION_ERROR'
                })
              )
            };
          })
        };
      });

      const result = await competitionServices.checkIfCompetitionEntryRequiresPayment(
        mockSupabase as unknown as SupabaseClient<Database>,
        'comp-error'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(CompetitionError);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });
  });
});
