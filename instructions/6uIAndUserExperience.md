# UI & User Experience

## 1. Overall Layout

### Navigation Bar (`components/Navbar.tsx`)
```typescript
export default function Navbar() {
  const { data: session } = useSession();
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo />
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/leaderboard">Leaderboard</Link>
            </div>
          </div>
          <div className="flex items-center">
            {session ? (
              <UserMenu user={session.user} />
            ) : (
              <Link href="/auth/signin">Sign In</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

### Footer
```typescript
export default function Footer() {
  return (
    <footer className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider">Legal</h3>
            <ul className="mt-4 space-y-4">
              <li><Link href="/terms">Terms & Conditions</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider">Support</h3>
            <ul className="mt-4 space-y-4">
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

## 2. Landing Page (`pages/index.tsx`)
```typescript
export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h1 className="text-4xl font-bold">Last Man Standing</h1>
          <p className="mt-4 text-xl">Pick a team each week. Don't pick the same team twice. Last one standing wins!</p>
          <Link href="/auth/signup" className="mt-8 inline-block bg-white text-blue-600 px-6 py-3 rounded-lg">
            Join Competition
          </Link>
        </div>
      </section>

      {/* Prize Pot */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold">Current Prize Pot</h2>
            <p className="text-4xl font-bold text-green-600">£{prizePot}</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">1</div>
              <h3 className="font-semibold">Pick a Team</h3>
              <p>Select one team each week</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">2</div>
              <h3 className="font-semibold">Don't Repeat</h3>
              <p>Can't pick the same team twice</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">3</div>
              <h3 className="font-semibold">Win Big</h3>
              <p>Last one standing takes the prize</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
```

## 3. Authentication Pages

### Sign Up (`pages/auth/signup.tsx`)
```typescript
export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {/* Email and password fields */}
          </div>
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## 4. Dashboard (`pages/dashboard.tsx`)
```typescript
export default function Dashboard() {
  const { data: session } = useSession();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Status Banner */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Current Round</h3>
            <p className="text-2xl font-bold">{currentRound}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Deadline</h3>
            <p className="text-2xl font-bold">{deadline}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Remaining Players</h3>
            <p className="text-2xl font-bold">{remainingPlayers}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Prize Pot</h3>
            <p className="text-2xl font-bold">£{prizePot}</p>
          </div>
        </div>
      </div>

      {/* Team Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Select Your Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isSelected={selectedTeam?.id === team.id}
              isDisabled={usedTeams.includes(team.id)}
              onClick={() => handleTeamSelect(team)}
            />
          ))}
        </div>
      </div>

      {/* History Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Your History</h2>
        <div className="space-y-4">
          {picks.map((pick) => (
            <PickHistoryItem key={pick.id} pick={pick} />
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmModal
          team={selectedTeam}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
```

## 5. Leaderboard (`pages/leaderboard.tsx`)
```typescript
export default function Leaderboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Prize Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Current Prize Pot</h3>
            <p className="text-3xl font-bold">£{prizePot}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Active Players</h3>
            <p className="text-3xl font-bold">{activePlayers}</p>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rounds Survived
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teams Picked
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {players.map((player, index) => (
              <tr key={player.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {player.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {player.roundsSurvived}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {player.teamsPicked.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## 6. Payment Flow

### Success Page (`pages/payment-success.tsx`)
```typescript
export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Welcome to Last Man Standing!
          </h2>
          <p className="mt-2 text-gray-600">
            Your payment was successful. You're now ready to play!
          </p>
        </div>
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
```

## 7. Notifications

### Email Notifications
```typescript
// lib/notifications.ts
export async function sendRoundReminder(user: User, deadline: Date) {
  await sendEmail({
    to: user.email,
    subject: 'Round Reminder - Last Man Standing',
    template: 'round-reminder',
    data: {
      name: user.name,
      deadline: format(deadline, 'PPp'),
    },
  });
}

export async function sendRoundResults(user: User, result: 'advanced' | 'eliminated') {
  await sendEmail({
    to: user.email,
    subject: result === 'advanced' 
      ? 'Congratulations! You Advanced!' 
      : 'Round Results - Last Man Standing',
    template: result === 'advanced' ? 'round-advanced' : 'round-eliminated',
    data: {
      name: user.name,
      round: currentRound,
    },
  });
}
```

## Notes
- Implement responsive design for all components
- Add loading states and error handling
- Use consistent styling and spacing
- Implement proper form validation
- Add proper TypeScript types for all components
- Consider accessibility (ARIA labels, keyboard navigation)
- Add proper error boundaries
- Implement proper state management
- Add proper testing (unit, integration, e2e)
