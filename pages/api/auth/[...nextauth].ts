// pages/api/auth/[...nextauth].ts - API route for NextAuth.js authentication
import NextAuth from 'next-auth';
import { authOptions } from '../../../lib/auth';

// All NextAuth requests are handled by this file due to the [...nextauth] filename pattern
export default NextAuth(authOptions);
