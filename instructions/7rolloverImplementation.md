# Rollover Implementation

## 1. End of Competition Check
Create `lib/competition.ts`:
```typescript
export async function checkCompetitionEnd(competitionId: string) {
  // Get all active players
  const activePlayers = await pool.query(
    `SELECT user_id FROM picks 
     WHERE competition_id = $1 
     AND status = 'active'`,
    [competitionId]
  );

  // Get competition details
  const competition = await pool.query(
    `SELECT * FROM competitions WHERE id = $1`,
    [competitionId]
  );

  // Check if there's exactly one winner
  if (activePlayers.rows.length === 1) {
    // Single winner - award prize
    await awardPrize(competitionId, activePlayers.rows[0].user_id);
  } else if (activePlayers.rows.length === 0) {
    // No winners - rollover
    await handleRollover(competitionId);
  }
}

async function handleRollover(competitionId: string) {
  // Start a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Mark current competition as rolled over
    await client.query(
      `UPDATE competitions 
       SET status = 'completed', 
           rolled_over = true 
       WHERE id = $1`,
      [competitionId]
    );

    // Get the prize pot
    const { rows } = await client.query(
      `SELECT prize_pot FROM competitions WHERE id = $1`,
      [competitionId]
    );
    const rolloverAmount = rows[0].prize_pot;

    // Add to next competition's pot
    await client.query(
      `UPDATE competitions 
       SET prize_pot = prize_pot + $1,
           rollover_amount = $1
       WHERE id = (
         SELECT id FROM competitions 
         WHERE status = 'active' 
         ORDER BY start_date ASC 
         LIMIT 1
       )`,
      [rolloverAmount]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 2. UI Updates

### Landing Page Update
```typescript
export default function Home() {
  const [competition, setCompetition] = useState(null);

  useEffect(() => {
    // Fetch current competition details
    fetchCompetitionDetails();
  }, []);

  return (
    <div>
      {/* Prize Pot Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold">Current Prize Pot</h2>
            <p className="text-4xl font-bold text-green-600">
              £{competition?.prize_pot}
            </p>
            {competition?.rollover_amount > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  Includes £{competition.rollover_amount} rolled over from previous competition!
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
```

### Competition Details Component
```typescript
export function CompetitionDetails({ competition }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Competition Details</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Prize Pot</h3>
          <p className="text-2xl font-bold">£{competition.prize_pot}</p>
          {competition.rollover_amount > 0 && (
            <p className="text-sm text-blue-600 mt-1">
              Includes £{competition.rollover_amount} rollover
            </p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <p className="text-lg">
            {competition.rolled_over ? 'Rolled Over' : 'Active'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

## 3. Database Updates
Add to your competition table:
```sql
ALTER TABLE competitions
ADD COLUMN rolled_over BOOLEAN DEFAULT false,
ADD COLUMN rollover_amount DECIMAL(10,2) DEFAULT 0;
```

## Notes
- Implement proper error handling for database transactions
- Add logging for rollover events
- Consider edge cases (e.g., no next competition)
- Add admin notifications for rollovers
- Consider adding rollover history tracking
- Implement proper validation before rollover
- Add rollover information to competition history
- Consider adding rollover limits or rules
