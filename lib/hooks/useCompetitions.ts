import { useState, useEffect } from 'react';
import { Competition } from '../types/competition';

// this is a hook that fetches the competitions from the database
export function useCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompetitions() {
      try {
        const response = await fetch('/api/competitions');
        if (!response.ok) throw new Error('Failed to fetch competitions');
        const data = await response.json();
        setCompetitions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCompetitions();
  }, []);

  return { competitions, loading, error };
} 