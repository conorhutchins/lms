// This is just a test page to check the Stripe integration

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';
import Head from 'next/head';
import { useRouter } from 'next/router';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Configuration checker component
function StripeConfigChecker() {
  interface StripeConfig {
    stripe_api_version: string;
    default_price_id: string | null;
    webhook_secret_configured: boolean;
    nextauth_url: string | null;
  }

  interface PriceDetails {
    id?: string;
    active?: boolean;
    currency?: string;
    unit_amount?: number;
    product?: string;
    error?: string;
  }

  const [configState, setConfigState] = useState({
    loading: true,
    error: null as string | null,
    config: null as StripeConfig | null,
    priceDetails: null as PriceDetails | null
  });

  useEffect(() => {
    async function checkConfig() {
      try {
        const response = await fetch('/api/stripe/check-config');
        const data = await response.json();
        
        if (response.ok) {
          setConfigState({
            loading: false,
            error: null,
            config: data.config,
            priceDetails: data.priceDetails
          });
        } else {
          setConfigState({
            loading: false,
            error: data.error || 'Failed to load configuration',
            config: null,
            priceDetails: null
          });
        }
      } catch (err) {
        setConfigState({
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to check configuration',
          config: null,
          priceDetails: null
        });
      }
    }
    
    checkConfig();
  }, []);

  if (configState.loading) {
    return <div className="mt-6 p-4 bg-gray-100 rounded">Checking Stripe configuration...</div>;
  }

  if (configState.error) {
    return (
      <div className="mt-6 p-4 bg-red-100 text-red-800 rounded">
        <p><strong>Configuration Error:</strong> {configState.error}</p>
      </div>
    );
  }

  const { config, priceDetails } = configState;
  
  // Return early if config is null (shouldn't happen but TypeScript requires the check)
  if (!config) {
    return (
      <div className="mt-6 p-4 bg-red-100 text-red-800 rounded">
        <p><strong>Configuration Error:</strong> No configuration data available</p>
      </div>
    );
  }

  const hasConfigIssues = !config.default_price_id || 
                         (priceDetails && priceDetails.error) || 
                         !config.webhook_secret_configured;

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded">
      <h3 className="font-bold mb-2 text-black">Stripe Configuration</h3>
      
      {hasConfigIssues ? (
        <div className="text-orange-600 mb-2">⚠️ Configuration issues detected</div>
      ) : (
        <div className="text-green-600 mb-2">✅ Configuration looks good</div>
      )}
      
      <ul className="text-sm">
        <li className={config.default_price_id ? "text-green-600" : "text-red-600"}>
          {config.default_price_id 
            ? `✅ Price ID: ${config.default_price_id}` 
            : "❌ Missing STRIPE_DEFAULT_PRICE_ID"}
        </li>
        
        {priceDetails && priceDetails.error && (
          <li className="text-red-600">❌ {priceDetails.error}</li>
        )}
        
        {priceDetails && !priceDetails.error && priceDetails.currency && priceDetails.unit_amount && (
          <li className="text-green-600">
            ✅ Price validated: {priceDetails.currency} 
            {(priceDetails.unit_amount / 100).toFixed(2)}
          </li>
        )}
        
        <li className={config.webhook_secret_configured ? "text-green-600" : "text-orange-600"}>
          {config.webhook_secret_configured 
            ? "✅ Webhook secret configured" 
            : "⚠️ Missing webhook secret"}
        </li>
      </ul>
    </div>
  );
}

export default function StripeTestPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  // Check for successful redirect from Stripe
  const { session_id } = router.query;
  
  async function handleCheckout() {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitionId: 'test-competition'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Check if direct URL is available (new approach)
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        
        // Fall back to redirectToCheckout (original approach)
        if (data.sessionId) {
          const stripe = await stripePromise;
          const result = await stripe?.redirectToCheckout({
            sessionId: data.sessionId,
          });
          
          if (result?.error) {
            throw new Error(result.error.message);
          }
        } else {
          throw new Error('No session ID returned');
        }
      } else {
        // Handle API error
        throw new Error(data.error?.message || 'Failed to create checkout session');
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Stripe Test - Last Man Standing</title>
        <meta name="description" content="Test Stripe Checkout Integration" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-black">Stripe Integration Test</h1>
          
          {session_id && (
            <div className="mb-6 p-4 bg-green-100 text-green-800 rounded">
              <p><strong>Success!</strong> Checkout session completed.</p>
              <p className="text-sm">Session ID: {session_id}</p>
            </div>
          )}
          
          {message && (
            <div className="mb-6 p-4 bg-red-100 text-red-800 rounded">
              {message}
            </div>
          )}
          
          {status === 'loading' ? (
            <p>Loading...</p>
          ) : !session ? (
            <div className="text-center">
              <p className="mb-4">You need to be signed in to test the Stripe checkout.</p>
              <button
                onClick={() => signIn('google')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Sign in with Google
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-black">
                Click the button below to start a test Stripe checkout session.
                You&apos;ll be redirected to Stripe&apos;s checkout page.
              </p>
              
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Test Stripe Checkout'}
              </button>
              
              <div className="mt-6 text-sm text-gray-600">
                <p>For testing, use these Stripe test card details:</p>
                <ul className="list-disc pl-5 mt-2">
                  <li>Card number: 4242 4242 4242 4242</li>
                  <li>Expiry date: Any future date</li>
                  <li>CVC: Any 3 digits</li>
                  <li>Postcode: Any value</li>
                </ul>
              </div>
              
              {/* Add configuration checker for development */}
              <StripeConfigChecker />
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 