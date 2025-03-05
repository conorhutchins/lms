import { useSession } from 'next-auth/react';
import Hero from '../components/home/Hero';
import HowItWorks from '../components/home/HowItWorks';
import SignUpSection from '../components/home/SignUpSection';

export default function Home() {
  const { data: session } = useSession();

  return (
    <>
      <Hero />
      <HowItWorks />
      {!session && <SignUpSection />}
    </>
  );
}
