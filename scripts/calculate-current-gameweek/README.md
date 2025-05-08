# Gameweek Status Update Script

This script automatically updates the status flags for gameweeks in the database:
- `is_current`: The gameweek that's currently active or coming up next
- `is_next`: The gameweek after the current one
- `is_previous`: The gameweek before the current one
- `finished`: All gameweeks that have passed their deadline

## How It Works

The script:
1. Fetches all gameweeks for configured leagues and seasons
2. Compares the current date with each gameweek's deadline time
3. Determines which gameweek should be marked as current, next, and previous
4. Updates the database with the new status flags

## Requirements

- Node.js 16+
- Supabase project with proper database setup
- Service role key for Supabase (for use in scheduled scripts)

## Setup

1. Ensure you have a `.env.local` file in the root directory with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for scheduled scripts
   ```

2. Install dependencies if not already done:
   ```
   npm install
   ```

3. Install `tsx` to run TypeScript files directly:
   ```
   npm install -D tsx
   ```

4. Add the script to your package.json:
   ```json
   "scripts": {
     "update-gameweeks": "tsx scripts/calculate-current-gameweek/calculate-current-gameweek.ts"
   }
   ```

## Running the Script Manually

```bash
# From the project root
npm run update-gameweeks
```

## Setting Up as a Cron Job

### Using GitHub Actions

Create a file at `.github/workflows/update-gameweek-status.yml`:

```yaml
name: Update Gameweek Status

on:
  schedule:
    # Run twice daily at 00:00 and 12:00 UTC
    - cron: '0 0,12 * * *'
  workflow_dispatch: # Allows manual triggering

jobs:
  update-gameweek-status:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: 16
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install tsx
        run: npm install -g tsx
        
      - name: Run script
        run: tsx scripts/calculate-current-gameweek/calculate-current-gameweek.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Using Vercel Cron Jobs (vercel.json)

If your app is deployed on Vercel, add the following to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-gameweek-status",
      "schedule": "0 0,12 * * *"
    }
  ]
}
```

Then make sure your API endpoint at `pages/api/cron/update-gameweek-status.ts` is properly configured.

### Using System Cron (Linux/macOS)

1. Make a shell script to run the Node.js script:

```bash
#!/bin/bash
# update-gameweek-status.sh
cd /path/to/your/project
export $(grep -v '^#' .env.local | xargs)  # Load environment variables
npx tsx scripts/calculate-current-gameweek/calculate-current-gameweek.ts
```

2. Make it executable:
```bash
chmod +x update-gameweek-status.sh
```

3. Add to crontab:
```bash
crontab -e
```

4. Add this line to run twice daily at midnight and noon:
```
0 0,12 * * * /path/to/your/project/update-gameweek-status.sh >> /path/to/your/project/logs/update-gameweek-status.log 2>&1
```

## Customization

To update different leagues or seasons, modify the `leaguesToUpdate` array in the script:

```typescript
const leaguesToUpdate = [
  { leagueId: 39, season: 2023 }, // Premier League 2023
  { leagueId: 39, season: 2024 }, // Premier League 2024/25
  { leagueId: 140, season: 2023 }, // La Liga 2023
  // Add other leagues as needed
];
```

## Troubleshooting

- Check the script logs for detailed error messages
- Ensure your Supabase credentials are correct in `.env.local`
- Verify that your `gameweeks` table has the appropriate columns 