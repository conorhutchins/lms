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
npx tsx scripts/populate-fixtures/populate-fixtures.ts 
```

# ... (Rest of script description remains the same) ...

## Environment Setup

These scripts require the following environment variables in your `.env.local` file:

```
# API Football
API_FOOTBALL_KEY=your_api_key
API_FOOTBALL_HOST=v3.football.api-sports.io

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # Likely needed for scripts modifying data
```

## 2. Results Fetching API Route (Example Implementation)

This example shows a basic structure for an API route to process results. **It should be adapted to use your Supabase client and service layer.**

Create `pages/api/results/process.ts` (or similar):

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { createApiRouteCookieMethods } from '../../lib/utils/supabaseServerHelpers/supabaseSeverHelpers'; 
import type { Database } from '../../lib/types/supabase';
// Import your results processing service
// import { resultsService } from '../../lib/db/services/results'; 
import axios from 'axios'; // If fetching external data

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { // Changed to POST, as it modifies data
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Optional: Add security (e.g., check a secret key) to prevent unauthorized triggers
  // if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Consider if SERVICE_ROLE needed
    { cookies: createApiRouteCookieMethods(req, res) }
  );

  try {
    // 1. Fetch results data from external source (e.g., API-Football)
    const { date } = req.query; // Or get relevant gameweek/round ID
    const externalApiResponse = await axios.get(
      `https://${process.env.API_FOOTBALL_HOST}/fixtures`, // Example API endpoint
      {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
        params: { date: date } // Adjust params as needed
      }
    );
    const matches = externalApiResponse.data.response; // Adjust based on actual API response structure

    // 2. Process results using your service layer
    console.log(`Processing results for ${matches.length} matches...`);
    // Example - Replace with your actual service logic
    // const processingResult = await resultsService.processMatchResults(supabase, matches);
    // if (processingResult.error) {
    //   throw processingResult.error; // Let the catch block handle it
    // }

    // Placeholder for success logic
    await processMatchResultsPlaceholder(supabase, matches);

    res.status(200).json({ message: 'Results processed successfully' });

  } catch (error: any) {
    console.error('Error processing results:', error);
    // Map service errors to status codes if needed
    res.status(500).json({ error: 'Failed to process results', details: error?.message });
  }
}

// Placeholder function - replace with actual service call
async function processMatchResultsPlaceholder(supabase: any, matches: any[]) {
  console.warn('Using placeholder function for processMatchResults');
  for (const match of matches) {
    const fixtureId = match.fixture.id;
    const homeScore = match.goals.home;
    const awayScore = match.goals.away;
    const status = match.fixture.status.short; // e.g., 'FT'

    // Example: Update fixture in DB (adapt table/column names)
    console.log(`Updating fixture ${fixtureId}: ${homeScore}-${awayScore} (${status})`);
    // const { error: updateError } = await supabase
    //   .from('fixtures')
    //   .update({ home_score: homeScore, away_score: awayScore, status: status, results_processed: true })
    //   .eq('external_id', fixtureId);
    // if (updateError) console.error(`Error updating fixture ${fixtureId}:`, updateError);

    // Example: Update picks (adapt logic/table names)
    // await updateUserPicksPlaceholder(supabase, match);
  }
}

// Placeholder for updating picks
// async function updateUserPicksPlaceholder(supabase: any, match: any) { ... }
```

## 3. Scheduled Updates

Create a GitHub Actions workflow (`.github/workflows/update-results.yml`) or use a cron job service (like Vercel Cron Jobs) to trigger your API endpoint.

**Example using Vercel Cron Jobs (in `vercel.json`):**

```json
{
  "crons": [
    {
      "path": "/api/results/process",
      "schedule": "0 */4 * * *" // Every 4 hours
    }
  ]
}
```

**Example GitHub Action:**

```yaml
name: Update Football Results

on:
  schedule:
    - cron: '0 */4 * * *'  # Run every 4 hours
  workflow_dispatch: # Allows manual trigger

jobs:
  update-results:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger API endpoint
        env:
          DEPLOY_URL: ${{ secrets.YOUR_DEPLOY_URL }} # e.g., https://your-app.vercel.app
          CRON_SECRET: ${{ secrets.YOUR_CRON_SECRET }} # Add a secret for security
        run: |
          curl -X POST "$DEPLOY_URL/api/results/process" \
          -H "Authorization: Bearer $CRON_SECRET" \
          --fail # Make the job fail if curl fails
```

## Notes
- **Adapt API Example:** The provided API route code is a template. You MUST adapt it to use your actual Supabase service layer for database interactions.
- **Security:** Protect your processing endpoint (e.g., using a secret key checked in the handler) if triggering via public URLs.
- **Idempotency:** Ensure your processing logic can be run multiple times for the same match without causing issues.
- Consider rate limits of the football API.
- Implement robust error handling, retries, and logging.
- Handle postponed or cancelled matches appropriately.
- Consider timezone differences.
- Add monitoring for scheduled jobs. 