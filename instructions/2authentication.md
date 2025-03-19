## Authentication (NextAuth.js)

### Environment Variables (.env)
```ini
NEXTAUTH_SECRET= <YourSecretKey>
NEXTAUTH_URL= <YourAppURL>
```

### NextAuth Configuration (pages/api/auth/[...nextauth].ts)
```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate user credentials
        return { id: '123', name: 'Test User', email: credentials?.email };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
});
```

### Protected Pages Example
```typescript
import { useSession } from 'next-auth/react';

export default function Dashboard() {
  const { data: session } = useSession();
  
  if (!session) return <SignInPage />;
  
  return <div>Protected Dashboard Content</div>;
}
```