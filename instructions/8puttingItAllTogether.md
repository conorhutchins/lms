# Putting It All Together

## 1. User Workflow

### 1.1 Landing Page to Payment
```typescript
// pages/index.tsx
export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h1 className="text-4xl font-bold">Last Man Standing</h1>
          <p className="mt-4 text-xl">Pick a team each week. Don't pick the same team twice. Last one standing wins!</p>
          <Link 
            href="/auth/signup" 
            className="mt-8 inline-block bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Join Now
          </Link>
        </div>
      </section>
    </div>
  );
}
```

### 1.2 Payment Flow
```typescript
// pages/api/payments/checkout.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { competitionId, userEmail, userId } = req.body;
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: { name: 'Last Man Standing Entry Fee' },
            unit_amount: 500, // £5
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.origin}/payment-success?competitionId=${competitionId}`,
        cancel_url: `${req.headers.origin}/payment-cancel`,
        metadata: { userId, competitionId },
      });

      res.status(200).json({ url: session.url });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

### 1.3 Team Selection
```typescript
// components/TeamSelection.tsx
export function TeamSelection({ teams, usedTeams, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {teams.map((team) => (
        <button
          key={team.id}
          onClick={() => onSelect(team)}
          disabled={usedTeams.includes(team.id)}
          className={`
            p-4 rounded-lg border
            ${usedTeams.includes(team.id) 
              ? 'opacity-50 cursor-not-allowed bg-gray-100' 
              : 'hover:bg-blue-50 cursor-pointer'}
          `}
        >
          <img src={team.logo} alt={team.name} className="w-16 h-16 mx-auto" />
          <p className="mt-2 text-center font-medium">{team.name}</p>
        </button>
      ))}
    </div>
  );
}
```

## 2. Styling with Tailwind CSS

### 2.1 Brand Colors
```css
/* styles/globals.css */
@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors;
  }
  
  .card {
    @apply bg-white rounded-lg shadow p-6;
  }
  
  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500;
  }
}
```

### 2.2 Common Components
```typescript
// components/ui/Button.tsx
export function Button({ children, variant = 'primary', ...props }) {
  const baseStyles = 'px-4 py-2 rounded transition-colors';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    disabled: 'opacity-50 cursor-not-allowed',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

## 3. Testing

### 3.1 Unit Tests
```typescript
// __tests__/teamSelection.test.ts
describe('Team Selection', () => {
  it('should not allow selecting already used teams', () => {
    const usedTeams = ['team1', 'team2'];
    const onSelect = jest.fn();
    
    render(<TeamSelection teams={teams} usedTeams={usedTeams} onSelect={onSelect} />);
    
    const disabledTeam = screen.getByText('Team 1');
    fireEvent.click(disabledTeam);
    
    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

### 3.2 Integration Tests
```typescript
// __tests__/paymentFlow.test.ts
describe('Payment Flow', () => {
  it('should complete signup → payment → team selection flow', async () => {
    // Sign up
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByText('Sign Up'));

    // Payment
    await waitFor(() => {
      expect(screen.getByText('Stripe Checkout')).toBeInTheDocument();
    });

    // Team Selection
    await waitFor(() => {
      expect(screen.getByText('Select Your Team')).toBeInTheDocument();
    });
  });
});
```

## 4. Database Operations

### 4.1 Team Selection
```typescript
// lib/teamSelection.ts
export async function selectTeam(userId: string, teamId: string, competitionId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if team already used
    const { rows } = await client.query(
      `SELECT id FROM picks 
       WHERE user_id = $1 
       AND competition_id = $2 
       AND team_id = $3`,
      [userId, competitionId, teamId]
    );

    if (rows.length > 0) {
      throw new Error('Team already selected');
    }

    // Record the pick
    await client.query(
      `INSERT INTO picks (user_id, competition_id, team_id, status)
       VALUES ($1, $2, $3, 'active')`,
      [userId, competitionId, teamId]
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

## 5. Final Checkpoints

### 5.1 Legal & Terms
```typescript
// components/LegalNotice.tsx
export function LegalNotice() {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Important Legal Information</h3>
      <p className="text-sm text-gray-600">
        By participating in Last Man Standing, you confirm that you are 18 years of age or older and a resident of the United Kingdom.
      </p>
      <Link 
        href="/terms" 
        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
      >
        Read Terms & Conditions
      </Link>
    </div>
  );
}

// pages/terms.tsx
export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
      <div className="prose">
        <h2>1. Eligibility</h2>
        <p>Participants must be 18 years of age or older and residents of the United Kingdom.</p>
        
        <h2>2. Entry Fees</h2>
        <p>Entry fees are non-refundable once a competition has started.</p>
        
        <h2>3. Prize Distribution</h2>
        <p>Prizes will be distributed within 30 days of competition completion.</p>
        
        {/* Add more terms as needed */}
      </div>
    </div>
  );
}
```

### 5.2 Security Implementation
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ]
      }
    ];
  }
};

// lib/security.ts
export function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'NEXTAUTH_SECRET',
    'FOOTBALL_API_KEY'
  ];

  const missing = requiredEnvVars.filter(
    envVar => !process.env[envVar]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
```

### 5.3 Performance Optimization
```typescript
// pages/leaderboard.tsx
export async function getStaticProps() {
  const leaderboard = await fetchLeaderboard();
  
  return {
    props: {
      leaderboard,
      lastUpdated: new Date().toISOString()
    },
    revalidate: 300 // Revalidate every 5 minutes
  };
}

// lib/cache.ts
export async function getCachedData(key: string) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFreshData(key);
  await redis.set(key, JSON.stringify(data), 'EX', 3600); // Cache for 1 hour
  return data;
}
```

### 5.4 Rollback & Recovery
```typescript
// pages/api/admin/override-result.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify admin authentication
  const session = await getSession({ req });
  if (!session?.user?.isAdmin) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    const { matchId, homeScore, awayScore, status } = req.body;
    
    // Update match result
    await pool.query(
      `UPDATE matches 
       SET home_score = $1, 
           away_score = $2, 
           status = $3,
           updated_by = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [homeScore, awayScore, status, session.user.id, matchId]
    );

    // Recalculate affected picks
    await recalculatePicks(matchId);

    res.status(200).json({ message: 'Result updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// lib/fallback.ts
export async function getMatchResults(matchId: string) {
  try {
    // Try primary API
    const result = await footballApi.getMatch(matchId);
    return result;
  } catch (error) {
    // Fallback to backup API
    try {
      const backupResult = await backupFootballApi.getMatch(matchId);
      return backupResult;
    } catch (backupError) {
      // If both fail, use cached data
      const cached = await redis.get(`match:${matchId}`);
      if (cached) return JSON.parse(cached);
      
      throw new Error('All data sources failed');
    }
  }
}
```

## Additional Implementation Notes

### Security Checklist
- [ ] Enable HTTPS (configured in next.config.js)
- [ ] Implement rate limiting for API routes
- [ ] Set up proper CORS policies
- [ ] Use secure session management
- [ ] Implement input validation
- [ ] Set up proper error logging
- [ ] Configure security headers
- [ ] Use prepared statements for all database queries
- [ ] Implement proper password hashing
- [ ] Set up proper backup procedures

### Performance Checklist
- [ ] Implement proper caching strategies
- [ ] Use CDN for static assets
- [ ] Optimize images
- [ ] Implement proper database indexing
- [ ] Use connection pooling
- [ ] Implement proper error boundaries
- [ ] Set up monitoring
- [ ] Configure proper logging
- [ ] Implement proper backup strategies

### Recovery Checklist
- [ ] Set up database backups
- [ ] Implement proper error handling
- [ ] Set up monitoring and alerts
- [ ] Create recovery procedures
- [ ] Document all procedures
- [ ] Test recovery procedures
- [ ] Set up proper logging
- [ ] Implement proper validation
- [ ] Set up proper security measures
