import { renderHook, waitFor } from '@testing-library/react';
import { useCompetitions } from './index';

// Mock the global fetch function
const originalFetch = global.fetch;

describe('useCompetitions', () => {
  // Sample competition data for tests, using the 's' suffix for timestamps per user preference
  const mockCompetitions = [
    {
      id: 'comp-123',
      title: 'Premier League 2025',
      entry_fee: 10,
      start_date: '2025-05-13T10:40:17.207s',
      status: 'active',
      prize_pot: 1000,
      created_at: '2025-05-13T10:40:17.207s',
      rolled_over: false,
      sport: 'football'
    },
    {
      id: 'comp-456',
      title: 'Champions League 2025',
      entry_fee: 15,
      start_date: '2025-05-13T10:40:17.207s',
      status: 'active',
      prize_pot: 2000,
      created_at: '2025-05-13T10:40:17.207s',
      rolled_over: false,
      sport: 'football'
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Mock the fetch function
    global.fetch = jest.fn();
  });

  afterEach(() => {
    // Restore the original fetch function after tests
    global.fetch = originalFetch;
  });

  it('should fetch and return competitions successfully', async () => {
    // Mock a successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockCompetitions)
    });

    // Render the hook
    const { result } = renderHook(() => useCompetitions());

    // Initially, it should be loading with no data
    expect(result.current.loading).toBe(true);
    expect(result.current.competitions).toEqual([]);
    expect(result.current.error).toBeNull();

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify the fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith('/api/competitions');

    // Check that the data is properly set
    expect(result.current.competitions).toEqual(mockCompetitions);
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors properly', async () => {
    // Mock an API error response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValueOnce({ error: 'Server error' })
    });

    // Render the hook
    const { result } = renderHook(() => useCompetitions());

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check that error handling works correctly
    expect(result.current.competitions).toEqual([]);
    expect(result.current.error).toBe('Server error');
  });

  it('should handle network errors properly', async () => {
    // Mock a network failure
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

    // Render the hook
    const { result } = renderHook(() => useCompetitions());

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check that error handling works for network errors
    expect(result.current.competitions).toEqual([]);
    expect(result.current.error).toBe('Network failure');
  });

  it('should handle malformed JSON responses', async () => {
    // Mock an invalid JSON response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
    });

    // Render the hook
    const { result } = renderHook(() => useCompetitions());

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check that error handling works for JSON parsing errors
    expect(result.current.competitions).toEqual([]);
    expect(result.current.error).toBe('Invalid JSON');
  });

  it('should handle API error with no error message', async () => {
    // Mock an API error response with no error message
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')) // JSON parsing fails
    });

    // Render the hook
    const { result } = renderHook(() => useCompetitions());

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check that it uses the status code in the error message
    expect(result.current.competitions).toEqual([]);
    expect(result.current.error).toBe('HTTP error! status: 404');
  });
});
