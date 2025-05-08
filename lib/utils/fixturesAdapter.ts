// quick adapter function to convert database fixtures to the format expected by the UI components

type DatabaseFixture = {
  id: string;
  external_id?: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team: string | null;
  away_team: string | null;
  kickoff_time: string | null;
  [key: string]: unknown; // Leave it open to other properties in the database fixture
};

export type Fixture = {
  id: string;
  external_id?: string;
  home_team_id: string | number;
  away_team_id: string | number;
  home_team: string;
  away_team: string;
  kickoff_time?: string;
};

// function to convert database fixtures to the format expected by the UI components
export function adaptFixtures(fixtures: DatabaseFixture[]): Fixture[] {
  return fixtures.map(f => ({
    id: f.id,
    external_id: f.external_id?.toString(),
    home_team_id: f.home_team_id ?? '', 
    away_team_id: f.away_team_id ?? '',
    home_team: f.home_team || '',
    away_team: f.away_team || '',
    kickoff_time: f.kickoff_time || undefined
  }));
} 