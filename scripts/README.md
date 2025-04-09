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

### Fetch Fixtures (Development Only)

The `fetch-fixtures.js` script is a simpler version that just fetches and saves fixture data to a JSON file without inserting into the database. Useful for debugging API responses.

```bash
# Run the fetch-only script
node scripts/fetch-fixtures.js
```

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