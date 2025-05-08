# LMS App Scripts

This directory contains utility scripts for managing data in the LMS application.

## Team Management

### Organise Teams

The `organise-teams.ts` script manages Premier League team data in the Supabase database:

- Adds new teams to the database
- Updates existing teams' API IDs and league status
- Marks relegated teams as "Former Premier League" instead of deleting them

This script is useful when:
- Setting up the app initially
- Starting a new season with promoted/relegated teams
- Updating team data

```bash
# Run the script to manage teams
npx tsx scripts/organise-teams/organise-teams.ts
```

## Gameweek Management

### Update Gameweek Status

The `calculate-current-gameweek.ts` script automatically updates gameweek statuses based on the current date:

- Sets current, next, and previous gameweeks
- Marks finished gameweeks

```bash
# Run the script to update gameweek statuses
npx tsx scripts/calculate-current-gameweek/calculate-current-gameweek.ts
```

### Manually Control Gameweek Status

The `manually-control-gameweek-status.ts` script provides a CLI tool for testing different gameweek states:

- Reset all gameweeks to default
- Set a specific gameweek as current
- Set up testing scenarios

```bash
# Run the script to control gameweek status
npx tsx scripts/manually-control-gameweek\ status/manually-control-gameweek-status.ts
```

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