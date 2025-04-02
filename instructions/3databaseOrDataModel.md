# Database & Data Models

## Overview
The application uses PostgreSQL for data storage. For local development, you can use Docker or a managed service.

## Database Tables

### Users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255)  -- If storing credentials
);
```

### Competitions
```sql
CREATE TABLE competitions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    entry_fee DECIMAL(10,2),
    start_date TIMESTAMP,
    status VARCHAR(50),  -- active, completed
    prize_pot DECIMAL(10,2),
    rolled_over BOOLEAN DEFAULT false  -- Flag for when no one wins
);
```

### Rounds
```sql
CREATE TABLE rounds (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id),
    round_number INTEGER,
    deadline_date TIMESTAMP
);
```

### Picks
```sql
CREATE TABLE picks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    round_id INTEGER REFERENCES rounds(id),
    team_id INTEGER,
    status VARCHAR(50),  -- active, eliminated
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Teams
```sql
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    league VARCHAR(255)
    -- Or just store team IDs as provided by the football API
);
```

### Payments
```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    competition_id INTEGER REFERENCES competitions(id),
    amount DECIMAL(10,2),
    payment_status VARCHAR(50),
    payment_type VARCHAR(50),  -- 'entry', 'rebuy', 'free_hit'
    free_hit_round_id INTEGER REFERENCES rounds(id),  -- Only used for free_hit
    free_hit_used BOOLEAN DEFAULT false,              -- Only relevant for free_hit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Notes
- Adjust or add columns as needed based on specific requirements
- Consider adding indexes for frequently queried columns
- Add appropriate foreign key constraints
- Consider adding timestamps (created_at, updated_at) to all tables
