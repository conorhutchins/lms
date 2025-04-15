# 2. 🔐 Authentication (Supabase Auth & @supabase/ssr)

## Overview

This application uses Supabase for user authentication, leveraging the `@supabase/ssr` library for seamless integration with Next.js, handling both client-side and server-side authentication state.

## Environment Variables (.env.local)

Ensure the following variables are set in your `.env.local` file:

```ini
NEXT_PUBLIC_SUPABASE_URL=<Your Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Your Supabase Project Anon Key>
# SUPABASE_SERVICE_ROLE_KEY=<Your Supabase Service Role Key> # Needed for admin tasks
```

## Core Concepts

1.  **Middleware (`middleware.ts`):**
    *   Intercepts requests to refresh the user's session cookie if it has expired. This is crucial for keeping the server-side (API routes, Server Components) aware of the user's authentication status.
    *   Uses `createServerClient` from `@supabase/ssr` configured with cookie helpers for the middleware context.

2.  **Client-Side Auth Provider (`components/auth/SupabaseAuthProvider.tsx`):**
    *   Runs on the client (`'use client';`).
    *   Creates a singleton Supabase client instance using the helper from `src/lib/supabase/client.ts`.
    *   Fetches the initial session on load.
    *   Subscribes to `onAuthStateChange` to reactively update the session state whenever the user logs in or out.
    *   Provides the `supabase` client instance and the current `session` object via React Context (`SupabaseContext`).

3.  **Context Hook (`lib/context/SupabaseContext.ts`):**
    *   Defines the `SupabaseContext`.
    *   Exports the `useSupabase` hook, allowing any client component to easily access the shared `supabase` client and `session` state.

4.  **Authentication Actions (`lib/hooks/useAuthActions/index.ts`):**
    *   A custom hook that encapsulates the logic for performing sign-in, sign-up, and sign-out operations using the `supabase` client obtained via `useSupabase`.
    *   Manages loading and error states specific to these actions.

## Usage

### Accessing Session/Client in Components

```typescript
// Example Client Component
'use client';

import { useSupabase } from '../lib/context/SupabaseContext';

export default function SomeComponent() {
  const { supabase, session } = useSupabase();

  if (!session) {
    return <p>Please log in.</p>;
  }

  return (
    <div>
      <p>Welcome, {session.user.email}</p>
      {/* Use supabase client for data fetching if needed */}
    </div>
  );
}
```

### Performing Login/Signup

```typescript
// Example Login Page Component
'use client';

import { useState, FormEvent } from 'react';
import { useAuthActions } from '../lib/hooks/useAuthActions'; // Note the adjusted path

export default function LoginPage() {
  const { loading, error, signInWithPassword } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await signInWithPassword(email, password);
    // Redirect is handled by session state change listener in SupabaseAuthProvider
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Input fields for email/password */}
      {error && <p style={{color: 'red'}}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### API Routes & Server-Side

API Routes need to create their own request-specific Supabase client using `createServerClient` and appropriate cookie helpers (like `createApiRouteCookieMethods`) to access user sessions securely.

```typescript
// Example API Route (pages/api/some-protected-route.ts)
import { createServerClient } from '@supabase/ssr';
import { createApiRouteCookieMethods } from '../../lib/utils/supabaseServerHelpers'; // Adjust path if needed
import type { Database } from '../../lib/types/supabase';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createApiRouteCookieMethods(req, res) }
  );

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // User is authenticated, proceed...
  return res.status(200).json({ message: `Hello user ${session.user.id}` });
}
```