// All that is happening in this file is that are handling OAuth authentication callbacks from Supabase
// When users sign in, they're redirected to this endpoint with a success code or an error code

import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient, type CookieOptions, serialize } from '@supabase/ssr' // creates supabase client for server side
import { AuthError } from '@supabase/supabase-js' // handles supabase specific auth errors
import { Database } from '../../../lib/types/supabase' // pulls in supabase database types
import { ServiceError, AuthServiceError } from '../../../lib/types/service' // pulls in typed auth service errors

// Production: Consider adding a rate limiter middleware (install `express-rate-limit`)
// import rateLimit from 'express-rate-limit';

// // Example rate limiter setup
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again after 15 minutes'
// });

// Straight up redirects users to login page and gives them an error message
function handleAuthError(res: NextApiResponse, origin: string, error: ServiceError) {
  console.error(`Auth Error [${error.code}]:`, {
    message: error.message,
    originalError: error.originalError
  });
  
  // Production: Integrate with an error reporting service like Sentry
  // if (process.env.NODE_ENV === 'production') {
  //   // Make sure Sentry or your chosen service is initialized elsewhere
  //   Sentry.captureException(error.originalError || error, {
  //     extra: { code: error.code, message: error.message },
  //   });
  // }

  return res.redirect(
    `${origin}/login?error=${encodeURIComponent(error.message)}&code=${error.code}`
  );
}

/**
 * OAuth callback handler for Supabase authentication
 * Processes the OAuth provider's response and exchanges the code for a session
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // Production: Apply rate limiting if configured
  // try {
  //   await limiter(req, res);
  // } catch (error) {
  //   console.error("Rate limiter error:", error);
  //   // Handle rate limiter errors appropriately
  //   // Potentially return a generic error response without redirecting
  // }
  // if (res.headersSent) {
  //   // If limiter already sent a response (e.g., 429 Too Many Requests)
  //   return;
  // }

  // Production: Validate essential environment variables are present
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL ERROR: Missing Supabase environment variables (URL or Anon Key).");
    // Avoid redirect loop by sending a clear server error
    // This prevents users getting stuck if config is broken
    return res.status(500).json({ message: 'Server configuration error. Please contact support.' });
  }

  // Construct the origin URL reliably for both dev and prod
  // handle missing headers gracefully
  const getOriginUrl = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Production: Use NEXT_PUBLIC_SITE_URL if set, otherwise derive from headers
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (siteUrl) {
        return siteUrl;
      }
      console.warn('Warning: NEXT_PUBLIC_SITE_URL is not set for production. Attempting to derive from headers. Set NEXT_PUBLIC_SITE_URL for reliability.');
      // Derive from host header in production as a fallback
      const host = req.headers.host;
      if (host) {
        return `https://${host}`; // Assume HTTPS in production
      }
      // Last resort fallback - might be inaccurate if behind complex proxies
      return req.headers.origin || ''; // Should not happen if host is available
    } else {
      // Development: Use localhost or derive from headers
      const host = req.headers.host || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || 'http'; // Check for proxy header
      return req.headers.origin || `${protocol}://${host}`;
    }
  };
  const origin = getOriginUrl();

  // If origin could not be determined (should be rare), handle error
  if (!origin) {
    console.error("CRITICAL ERROR: Could not determine request origin URL.");
    return res.status(500).json({ message: 'Internal server error determining request origin.'});
  }

  // Production: Add security headers conditionally
  if (process.env.NODE_ENV === 'production') {
    // Sets the browser to only access the site through HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // Prevents the page from being displayed in an iframe (clickjacking protection)
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevents browsers from MIME-sniffing the content type
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Controls information sent in the Referer header
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Content-Security-Policy is crucial but highly specific. Configure carefully.
    // Example (restrictive): res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';"); 
  }

  try {
    // Method validation, anything other than GET is not allowed
    if (req.method !== 'GET') {
      throw new ServiceError(
        `Method ${req.method} Not Allowed`,
        'METHOD_NOT_ALLOWED'
      );
    }

    const { code, error, error_description } = req.query;
    
    console.log('Auth callback received:', {
      hasCode: !!code,
      error: error || 'none',
      description: error_description || 'none'
    });

    // OAuth error handling
    if (error) {
      const descriptionString = Array.isArray(error_description) 
        ? error_description[0] 
        : error_description;
      
      throw new ServiceError(
        descriptionString || 'Authentication failed. Please try again.',
        'OAUTH_ERROR',
        error // Preserve original error
      );
    }

    // Validate code parameter
    if (!code || typeof code !== 'string') {
      throw new AuthServiceError(
        'Invalid authentication request. Please try logging in again.',
        'INVALID_CODE'
      );
    }

    // Production & Dev: Define base cookie options, secure only in prod
    const baseCookieOptions: Partial<CookieOptions> = {
      path: '/',
      httpOnly: true, // Prevent client-side JS access
      secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
      sameSite: 'lax', // Good balance of security and usability
      maxAge: 60 * 60 * 24 * 7, // Example: 1 week expiry
    };

    // Create server side supabase client to manage auth cookies
    // Use validated env vars
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return req.cookies[name];
          },
          set(name: string, value: string, options: CookieOptions) {
            // Merge base secure options with specific options from Supabase
            const finalOptions = { ...baseCookieOptions, ...options };
            res.appendHeader('Set-Cookie', serialize(name, value, finalOptions));
          },
          remove(name: string, options: CookieOptions) {
            // Use base secure options, but set maxAge to 0 to delete the cookie
            const finalOptions = { ...baseCookieOptions, ...options, maxAge: 0 };
            res.appendHeader('Set-Cookie', serialize(name, '', finalOptions));
          },
        },
      }
    );

    console.log('Attempting to exchange code for session...');

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    // Handle errors during code exchange
    if (exchangeError) {
      throw new AuthServiceError(
        exchangeError.message.includes('verifier') // Check for specific verifier error
          ? 'Authentication link expired or already used. Please try logging in again.'
          : 'Authentication failed during code exchange. Please try again.',
        'EXCHANGE_ERROR',
        exchangeError // Preserve original Supabase error
      );
    }

    // Successfully authenticated
    console.log('Successfully authenticated via OAuth callback. Redirecting to /hub');
    return res.redirect(`${origin}/hub`); // Use the dynamically determined origin

  } catch (error) {
    // Centralized error handling using the determined origin

    // If it's already our specific AuthServiceError, handle it directly
    if (error instanceof AuthServiceError) {
      return handleAuthError(res, origin, error);
    }

    // Handle Supabase specific AuthErrors, converting them to our AuthServiceError
    if (error instanceof AuthError) {
      return handleAuthError(res, origin, new AuthServiceError(
        'A Supabase authentication error occurred. Please try again.',
        'EXCHANGE_ERROR', // Use a relevant code
        error // Preserve original Supabase error
      ));
    }

    // Handle any other unexpected errors
    return handleAuthError(res, origin, new AuthServiceError(
      'An unexpected server error occurred during authentication. Please try again.',
      'INTERNAL_ERROR',
      error // Preserve the original unknown error
    ));
  }
} 