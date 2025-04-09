# Create the file with the markdown content
cat > instructions/3databaseOrDataModel.md << 'EOL'
# 3. 🗃️ Database & Data Models (Supabase)

## Overview

The application uses Supabase PostgreSQL for data storage. For local development, connect via the Supabase CLI or Supabase Studio.

## Tables

Based on the schema reflected in `lib/types/supabase.ts` (generated via `supabase gen types`).

### Users (auth.users)

Supabase provides a built-in `auth.users` table.

### Profiles

Used to store additional user metadata, linked to `auth.users`.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text null, -- Note: Types show nullable
  created_at timestamp with time zone default now()
);
```

### Competitions

```sql
create table competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  entry_fee numeric(10,2) not null, -- Assuming non-null based on type `number`
  start_date timestamp with time zone not null, -- Assuming non-null
  status text not null, -- Assuming non-null
  prize_pot numeric(10,2) not null, -- Assuming non-null
  rolled_over boolean default false,
  created_at timestamp with time zone default now()
);
```

### Rounds

```sql
create table rounds (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete cascade not null,
  round_number integer not null,
  deadline_date timestamp with time zone not null,
  created_at timestamp with time zone default now()
);
```

### Teams

```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  league text null, -- Types show nullable
  external_api_id text null, -- Added field, from types
  created_at timestamp with time zone default now() -- Added field
);
```

### Picks

```sql
create table picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null, -- Added FK reference
  round_id uuid references rounds(id) on delete cascade not null,
  team_id uuid references teams(id) not null,
  status text not null, -- Assuming non-null
  pick_timestamp timestamp with time zone default now() -- Renamed from 'timestamp'
  -- competition_id field removed as it's not in regenerated types
);
```

### Payments

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  competition_id uuid references competitions(id) on delete cascade not null,
  amount numeric(10,2) not null,
  payment_status text not null,
  payment_type text not null,
  free_hit_round_id uuid references rounds(id) null, -- Changed to nullable
  free_hit_used boolean null, -- Changed to nullable, removed default false
  payment_provider text null, -- Added field
  provider_payment_id text null, -- Added field
  created_at timestamp with time zone default now()
);
```

### Fixtures

```sql
create table fixtures (
  id uuid primary key default gen_random_uuid(),
  external_id integer not null, -- ID from API-Football
  league_id integer not null, -- 39, 40, or 41
  season integer not null,
  round text null, -- Changed to nullable
  gameweek integer null, -- Changed to nullable
  home_team text null, -- Changed to nullable
  away_team text null, -- Changed to nullable
  home_team_id integer null, -- Changed to nullable
  away_team_id integer null, -- Changed to nullable
  kickoff_time timestamp with time zone null, -- Changed to nullable
  status text null, -- Changed to nullable
  home_score integer null, -- Changed to nullable
  away_score integer null, -- Changed to nullable
  results_processed boolean null, -- Added field
  created_at timestamp with time zone null -- Changed to nullable, removed default
);
```

## Relationships

- **Competitions**: Has many rounds and payments. (Picks no longer directly reference competition).
- **Rounds**: Belongs to a competition, has many picks. Referenced by payments (for free hits).
- **Teams**: Referenced by picks. Contains `external_api_id`.
- **Fixtures**: Contains match data. (No direct FKs to rounds/teams shown in types, relationships might be logical via IDs).
- **Picks**: Belongs to a user, round, and references a team.
- **Payments**: Belongs to a user and competition. Can reference a round for free hits.
- **Profiles**: Extends the `auth.users` table.

## Type Safety

The application uses TypeScript with strongly typed Supabase client:

```typescript
// in lib/db.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

This ensures type-safe database access with proper TypeScript IntelliSense support.

## Notes

- Use uuid as primary keys for Supabase best practices (`gen_random_uuid()`).
- Timestamps are `timestamp with time zone`. Defaults (`default now()`) are used where appropriate.
- Nullability (`null` vs `not null`) is based on the generated TypeScript types. Assumed `not null` for core fields unless types indicated otherwise (`string | null`, `number | null`).
- Use Supabase RLS (Row Level Security) for access control.
- This schema serves the Last Man Standing football competition app.
EOL