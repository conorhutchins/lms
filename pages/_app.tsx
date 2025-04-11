import Layout from '../components/layout/Layout';
import { Sora } from 'next/font/google';
import '../styles/globals.css'
import type { AppProps } from 'next/app';
import { Suspense } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
});

function MyApp({ Component, pageProps }: AppProps) {
  const supabaseClient = createClientComponentClient()
  
  return (
    <div className="overflow-x-hidden w-full h-full bg-black">
      <SessionContextProvider supabaseClient={supabaseClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <main className={`${sora.variable}`}>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </main>
        </Suspense>
      </SessionContextProvider>
    </div>
  );
}

export default MyApp;
