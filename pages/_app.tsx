// This file is the main entry point for the app
// It is used to wrap the app in the SupabaseAuthProvider
// and provide the SupabaseContext to the app

import Layout from '../components/layout/Layout';
import { Sora } from 'next/font/google';
import '../styles/globals.css'
import type { AppProps } from 'next/app';
import { Suspense } from 'react'
import { SupabaseAuthProvider } from '../components/auth/SupabaseAuthProvider';

import { Toaster } from "@/components/ui/toaster"

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SupabaseAuthProvider>
      <div className="overflow-x-hidden w-full h-full bg-black">
        <Suspense fallback={<div className="text-white text-center p-4">Loading...</div>}>
          <main className={`${sora.variable}`}>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </main>
        </Suspense>
        <Toaster />
      </div>
    </SupabaseAuthProvider>
  );
}

export default MyApp;
