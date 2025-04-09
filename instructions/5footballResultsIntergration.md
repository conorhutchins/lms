# Football Results Integration

## 1. API Setup
# LMS App Scripts

This directory contains utility scripts for managing data in the LMS application.

## Fixture Data Management

### Populate Fixtures

The `populate-fixtures.ts` script fetches football fixtures from the API-Football service and populates them in the Supabase database.

#### Usage

```bash
# Run the script to populate fixtures
npx tsx scripts/populate-fixtures.ts
```

#### Configuration

The script is currently configured to fetch Premier League fixtures from the 2023 season, which is available on the free tier of the API-Football service.

When you're ready to use current season data:

1. Obtain a paid API-Football subscription
2. Update the `LEAGUES_TO_FETCH` array in `populate-fixtures.ts` to include the current season
3. Run the script

#### Development vs. Production

- **Development**: Use the 2023 season fixtures (free tier) for building and testing
- **Production**: Use current season fixtures (paid tier) when launching the app


## Environment Setup

These scripts require the following environment variables in your `.env.local` file:

```
# API Football
API_FOOTBALL_KEY=your_api_key
API_FOOTBALL_HOST=v3.football.api-sports.io

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Results Fetching API Route
Create `pages/api/football/results.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { date } = req.query;
      
      const response = await axios.get(
        `https://api.football-data.org/v4/matches`,
        {
          headers: {
            'X-Auth-Token': process.env.FOOTBALL_API_KEY
          },
          params: {
            dateFrom: date,
            dateTo: date
          }
        }
      );

      // Process and store results
      const matches = response.data.matches;
      await processMatchResults(matches);

      res.status(200).json({ message: 'Results processed successfully' });
    } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({ error: 'Failed to fetch results' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function processMatchResults(matches: any[]) {
  for (const match of matches) {
    // Update match results in database
    await pool.query(
      `UPDATE fixtures 
       SET home_score = $1, away_score = $2, status = 'completed'
       WHERE fixture_id = $3`,
      [match.score.fullTime.home, match.score.fullTime.away, match.id]
    );

    // Update user picks based on results
    await updateUserPicks(match);
  }
}

async function updateUserPicks(match: any) {
  const fixtureId = match.id;
  const homeTeamWon = match.score.fullTime.home > match.score.fullTime.away;
  const awayTeamWon = match.score.fullTime.home < match.score.fullTime.away;
  const isDraw = match.score.fullTime.home === match.score.fullTime.away;

  // Update picks where users selected losing teams
  await pool.query(
    `UPDATE picks 
     SET status = 'eliminated'
     WHERE fixture_id = $1 
     AND (
       (team_id = $2 AND $3 = true) OR  -- Home team lost
       (team_id = $4 AND $5 = true)     -- Away team lost
     )`,
    [fixtureId, match.homeTeam.id, awayTeamWon, match.awayTeam.id, homeTeamWon]
  );
}
```

## 3. Scheduled Updates
Create a GitHub Actions workflow (`.github/workflows/update-results.yml`):
```yaml
name: Update Football Results

on:
  schedule:
    - cron: '0 */4 * * *'  # Run every 4 hours

jobs:
  update-results:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Trigger API endpoint
        run: |
          curl -X GET https://your-domain.com/api/football/results
```

## Notes
- Consider rate limits of the football API
- Implement error handling and retries
- Cache results to minimize API calls
- Handle postponed or cancelled matches
- Consider timezone differences
- Implement logging for debugging
- Add monitoring for the scheduled jobs
