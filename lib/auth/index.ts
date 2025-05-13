// lib/auth/index.ts - Central export for authentication functionality
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Extend the NextAuth types to include user ID
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

/**
 * All this file does is setup NextAuth with Google as the provider
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  // Using custom pages for authentication flows
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    // when a session is checked it just adds the user id to the session object
    async session({ session, token }) {
      if (session.user && token.id) {
        // Safely add id to session user
        session.user.id = token.id as string;
      }
      return session;
    },
    // when a token is created it just adds the user id to the token object
    async jwt({ token, user }) {
      // Persist user ID to the token
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions; 