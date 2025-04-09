# Create the file with the markdown content
cat > instructions/3databaseOrDataModel.md << 'EOL'
# 3. 🗃️ Database & Data Models (Supabase)

## Overview

The application uses Supabase PostgreSQL for data storage. For local development, connect via the Supabase CLI or Supabase Studio.

## Tables

### Users

Supabase provides a built-in `auth.users` table. If you need to store additional user metadata, use a separate profiles table:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamp with time zone default now()
);
```

### Competitions

```sql
create table competitions (
  id uuid primary key default gen_random_uuid(),
  title text,
  entry_fee numeric(10,2),
  start_date timestamp with time zone,
  status text,  -- 'active', 'completed'
  prize_pot numeric(10,2),
  rolled_over boolean default false,
  created_at timestamp with time zone default now()
);
```

### Rounds

```sql
create table rounds (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete cascade,
  round_number integer,
  deadline_date timestamp with time zone,
  created_at timestamp with time zone default now()
);
```

### Picks

```sql
create table picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  round_id uuid references rounds(id) on delete cascade,
  team_id uuid references teams(id),
  status text,  -- 'active', 'eliminated'
  timestamp timestamp with time zone default now()
);
```

### Teams

```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text,
  league text
);
```

### Payments

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  competition_id uuid references competitions(id) on delete cascade,
  amount numeric(10,2),
  payment_status text,
  payment_type text,  -- 'entry', 'rebuy', 'free_hit'
  free_hit_round_id uuid references rounds(id),
  free_hit_used boolean default false,
  created_at timestamp with time zone default now()
);
```
### Fixtures 

```
create table fixtures (
  id uuid primary key default gen_random_uuid(),
  external_id integer not null, -- ID from API-Football
  league_id integer not null, -- 39, 40, or 41
  season integer not null,
  round text,
  gameweek integer, -- optional if you want your own gameweek number
  home_team text,
  away_team text,
  home_team_id integer,
  away_team_id integer,
  kickoff_time timestamp with time zone,
  status text, -- 'NS', 'FT', 'PST', etc.
  home_score integer,
  away_score integer,
  created_at timestamp with time zone default now()
);
```
## Notes

- Use uuid as primary keys for Supabase best practices (`gen_random_uuid()`).
- Supabase automatically adds `created_at` fields in UI, but you can define explicitly as above.
- Adjust fields as needed per your application.
- Use Supabase RLS (Row Level Security) for access control.
EOL