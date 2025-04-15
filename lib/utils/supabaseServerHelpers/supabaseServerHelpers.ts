    import type { NextApiRequest, NextApiResponse } from 'next';
    import { type CookieOptions, parse, serialize } from '@supabase/ssr';

    // Helper function to create cookie methods for API routes
    export const createApiRouteCookieMethods = (req: NextApiRequest, res: NextApiResponse) => ({
      get(name: string): string | undefined {
        const cookies = parse(req.headers.cookie || '');
        return cookies[name];
      },
      set(name: string, value: string, options: CookieOptions): void {
        res.appendHeader('Set-Cookie', serialize(name, value, options));
      },
      remove(name: string, options: CookieOptions): void {
        res.appendHeader('Set-Cookie', serialize(name, '', { ...options, maxAge: 0 }));
      },
    });