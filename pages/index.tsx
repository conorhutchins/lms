import { useState, useEffect } from 'react';
import { createClient } from '../src/lib/supabase/client'; // Use our client-side creator
import type { User } from '@supabase/supabase-js'; // Import User type
import Hero from '../components/home/Hero';
import HowItWorks from '../components/home/HowItWorks';
import SignUpSection from '../components/home/SignUpSection';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Optionally show a loading state
  // if (loading) return <div>Loading...</div>; 

  return (
    <>
      <Hero />
      <HowItWorks />
      {/* Render SignUpSection only if user is not logged in */} 
      {!user && <SignUpSection />}
    </>
  );
}
