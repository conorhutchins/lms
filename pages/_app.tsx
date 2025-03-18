import { SessionProvider } from 'next-auth/react';
import Layout from '../components/layout/Layout';
import { Sora } from 'next/font/google';
import '../styles/globals.css'
import type { AppProps } from 'next/app';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
});

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <main className={`${sora.variable}`}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </main>
    </SessionProvider>
  );
}

export default MyApp;
