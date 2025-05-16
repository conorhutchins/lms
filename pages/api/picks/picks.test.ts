import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from './picks';
import { pickServices } from '../../../lib/db/services/pickService/pickService';
import { PickError } from '../../../lib/types/pick';
import { createServerClient } from '@supabase/ssr';

// Mock the modules we need
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('../../../lib/db/services/pickService/pickService', () => ({
  pickServices: {
    findUserPickForRound: jest.fn(),
    saveUserPick: jest.fn(),
  },
}));

jest.mock('../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers', () => ({
  createApiRouteCookieMethods: jest.fn(() => ({ get: jest.fn(), set: jest.fn() })),
}));

describe('/api/picks API endpoint', () => {
  // Common setup
  const mockUserId = 'user-123';
  const mockRoundId = 'round-123';
  const mockTeamId = 'team-123';
  const mockSession = {
    user: { id: mockUserId },
  };

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase auth session
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { gameweek_id: 'gw-123' },
          error: null,
        }),
      }),
    });
  });

  describe('Method validation', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
    });
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Mock no session
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
        },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { roundId: mockRoundId },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Authentication required' });
    });

    it('should return 401 when session error occurs', async () => {
      // Mock session error
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: new Error('Session error'),
          }),
        },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { roundId: mockRoundId },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Authentication required' });
    });
  });

  describe('GET request handling', () => {
    it('should return 400 when roundId is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {}, // No roundId
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Round ID is required' });
    });

    it('should return 400 when roundId is not a string', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { roundId: ['round-1', 'round-2'] }, // Array instead of string
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Round ID is required' });
    });

    it('should return 200 with pick data when found', async () => {
      const mockPick = {
        id: 'pick-123',
        user_id: mockUserId,
        round_id: mockRoundId,
        team_id: mockTeamId,
        status: 'active',
      };

      // Mock successful pick service response
      (pickServices.findUserPickForRound as jest.Mock).mockResolvedValue({
        data: mockPick,
        error: null,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { roundId: mockRoundId },
      });

      await handler(req, res);

      expect(pickServices.findUserPickForRound).toHaveBeenCalledWith(
        expect.anything(),
        mockUserId,
        mockRoundId
      );
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockPick);
    });

    it('should handle service errors appropriately', async () => {
      // Create a mock PickError
      

      const mockError = new PickError('Pick not found', 'NOT_FOUND');

      // Mock error response from service
      (pickServices.findUserPickForRound as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { roundId: mockRoundId },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404); // NOT_FOUND maps to 404
      expect(JSON.parse(res._getData())).toEqual({ error: 'Pick not found' });
    });
  });

  describe('POST request handling (single pick)', () => {
    it('should return 400 when roundId is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          teamId: mockTeamId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Round ID is required' });
    });

    it('should return 400 when teamId is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          roundId: mockRoundId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Team ID is required' });
    });

    it('should return 403 when gameweek is finished', async () => {
      // Mock gameweek finished
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'rounds') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { gameweek_id: 'gw-123' },
                error: null,
              }),
            };
          } else if (table === 'gameweeks') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { finished: true },
                error: null,
              }),
            };
          }
          return {};
        }),
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          roundId: mockRoundId,
          teamId: mockTeamId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Cannot make picks for a finished gameweek',
        code: 'GAMEWEEK_FINISHED',
      });
    });

    it('should return 403 when deadline has passed', async () => {
      // Set a past deadline
      const pastDeadline = new Date();
      pastDeadline.setDate(pastDeadline.getDate() - 1); // Yesterday

      // Mock deadline passed
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'rounds') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { gameweek_id: 'gw-123' },
                error: null,
              }),
            };
          } else if (table === 'gameweeks') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { 
                  finished: false,
                  deadline_time: pastDeadline.toISOString(),
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          roundId: mockRoundId,
          teamId: mockTeamId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Cannot make picks after deadline has passed',
        code: 'DEADLINE_PASSED',
      });
    });

    it('should return 200 when pick is saved successfully', async () => {
      // Mock future deadline
      const futureDeadline = new Date();
      futureDeadline.setDate(futureDeadline.getDate() + 1); // Tomorrow

      // Mock gameweek active
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'rounds') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { gameweek_id: 'gw-123' },
                error: null,
              }),
            };
          } else if (table === 'gameweeks') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { 
                  finished: false,
                  deadline_time: futureDeadline.toISOString(),
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      });

      const mockSavedPick = {
        id: 'pick-123',
        user_id: mockUserId,
        round_id: mockRoundId,
        team_id: mockTeamId,
        status: 'active',
      };

      // Mock successful save
      (pickServices.saveUserPick as jest.Mock).mockResolvedValue({
        data: mockSavedPick,
        error: null,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          roundId: mockRoundId,
          teamId: mockTeamId,
          isExternalId: true,
        },
      });

      await handler(req, res);

      expect(pickServices.saveUserPick).toHaveBeenCalledWith(
        expect.anything(),
        mockUserId,
        mockRoundId,
        mockTeamId.toString(),
        true
      );
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockSavedPick);
    });

    it('should handle service errors when saving pick', async () => {
      // Create a mock PickError
      

      const mockError = new PickError('Already picked this team', 'ALREADY_PICKED_TEAM_THIS_COMP');

      // Mock future deadline
      const futureDeadline = new Date();
      futureDeadline.setDate(futureDeadline.getDate() + 1); // Tomorrow

      // Mock gameweek active
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'rounds') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { gameweek_id: 'gw-123' },
                error: null,
              }),
            };
          } else if (table === 'gameweeks') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { 
                  finished: false,
                  deadline_time: futureDeadline.toISOString(),
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      });

      // Mock error response from service
      (pickServices.saveUserPick as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          roundId: mockRoundId,
          teamId: mockTeamId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400); // ALREADY_PICKED_TEAM_THIS_COMP maps to 400
      expect(JSON.parse(res._getData())).toEqual({ error: 'Already picked this team' });
    });
  });

  describe('POST request handling (batch picks)', () => {
    it('should return 400 when picks array is empty', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          picks: [],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ error: 'No picks provided' });
    });

    it('should process batch picks and return results', async () => {
      // Mock future deadline
      const futureDeadline = new Date();
      futureDeadline.setDate(futureDeadline.getDate() + 1); // Tomorrow

      // Mock gameweek active
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'rounds') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { gameweek_id: 'gw-123' },
                error: null,
              }),
            };
          } else if (table === 'gameweeks') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { 
                  finished: false,
                  deadline_time: futureDeadline.toISOString(),
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      });

      // Mock successful save for first pick
      const mockSavedPick1 = {
        id: 'pick-123',
        user_id: mockUserId,
        round_id: 'round-1',
        team_id: 'team-1',
        status: 'active',
      };

      // Mock error for second pick
      

      const mockError = new PickError('Already picked this team', 'ALREADY_PICKED_TEAM_THIS_COMP');

      // Mock the saveUserPick to return different responses for different inputs
      (pickServices.saveUserPick as jest.Mock).mockImplementation((supabase, userId, roundId, teamId) => {
        if (roundId === 'round-1' && teamId === 'team-1') {
          return Promise.resolve({
            data: mockSavedPick1,
            error: null,
          });
        } else {
          return Promise.resolve({
            data: null,
            error: mockError,
          });
        }
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          picks: [
            { roundId: 'round-1', teamId: 'team-1' },
            { roundId: 'round-2', teamId: 'team-2' },
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.successCount).toBe(1);
      expect(responseData.errorCount).toBe(1);
      expect(responseData.results).toHaveLength(2);
      expect(responseData.results[0].success).toBe(true);
      expect(responseData.results[1].success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should return 500 for unexpected errors', async () => {
      // Force an unexpected error
      (createServerClient as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { roundId: mockRoundId },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({ error: 'An unexpected error occurred' });
    });
  });
});
