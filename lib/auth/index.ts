// lib/auth/index.ts - Central export for authentication functionality
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

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
  // Using default NextAuth pages
  callbacks: {
    // when a session is checked it just adds the user id to the session object
    async session({ session, token }) {
      if (token.id) {
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