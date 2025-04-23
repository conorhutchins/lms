import { useState, useEffect } from 'react';
import { Competition } from '../../../types/competition';

// this is a hook that fetches the competitions /api/competitions
export function useCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompetitions() {
      setLoading(true); // Set loading true at the start of fetch
      setError(null); // Reset error
      try {
        // Fetch from the base API endpoint
        const response = await fetch('/api/competitions');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCompetitions(data || []);
      } catch (err) {
        console.error('Error fetching competitions:', err); // Log the error
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setCompetitions([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    }

    fetchCompetitions();
  }, []);

  return { competitions, loading, error };
} 