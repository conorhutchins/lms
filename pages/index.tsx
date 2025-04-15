import { useSupabase } from '../lib/context/SupabaseContext'; // used to get the session
import Hero from '../components/home/Hero';
import HowItWorks from '../components/home/HowItWorks';
import SignUpSection from '../components/home/SignUpSection';

export default function Home() {
  const { session } = useSupabase(); // take the session from the hook

  return (
    <>
      <Hero />
      <HowItWorks />
      {/* Show sign up section if user is not logged in */}
      {!session && <SignUpSection />}
    </>
  );
}
