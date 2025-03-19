import { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const Dashboard: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-primary font-bold text-xl">Loading...</div>
    </div>;
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen">
      <Head>
        <title>Dashboard - Last Man Standing</title>
        <meta name="description" content="Your Last Man Standing Dashboard" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 gradient-heading">Your Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-md border border-border/40">
            <h2 className="text-xl font-semibold mb-4 text-primary">Current Competition</h2>
            <div className="p-4 bg-muted/50 rounded-md text-muted-foreground">
              No active competitions. Join one to get started!
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md border border-border/40">
            <h2 className="text-xl font-semibold mb-4 text-primary">Your Team</h2>
            <div className="p-4 bg-muted/50 rounded-md text-muted-foreground">
              When the competition starts, you'll select your team here each week.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 