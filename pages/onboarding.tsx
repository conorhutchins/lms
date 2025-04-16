'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import { useUserProfile } from '../lib/hooks/data/useUserProfile';
import { useSupabase } from '../lib/context/SupabaseContext';
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../src/components/ui/card";

export default function OnboardingPage() {
  const { session } = useSupabase();
  const {
    userProfile,
    loading: profileLoading,
    updateProfileName,
    isUpdating,
    updateError
  } = useUserProfile();

  const router = useRouter();
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileLoading && !session) {
      console.log('Onboarding: No session found, redirecting to login.');
      router.replace('/login');
    }
    if (!profileLoading && userProfile?.name) {
       console.log('Onboarding: Profile name already exists, redirecting to hub.');
       router.replace('/hub');
    }
  }, [session, profileLoading, userProfile, router]);

  const handleNameSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (!name.trim()) {
      setLocalError('Please enter your name.');
      return;
    }

    const success = await updateProfileName(name);

    if (success) {
      router.push('/hub');
    }
  };

  if (profileLoading || (!session && !profileLoading)) {
     return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  if (!session) {
     return <div className="min-h-screen bg-black flex items-center justify-center text-white">Session not found. Please <a href="/login">login</a>.</div>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-[#111111] border-0 shadow-lg">
          <CardHeader className="text-center pt-10 pb-6">
            <CardTitle className="text-2xl font-normal text-white">Welcome Contender!</CardTitle>
            <p className="text-gray-400 pt-2">Let&apos;s get your profile set up.</p>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            {(updateError || localError) && (
              <div className="bg-red-900/20 border border-red-800 rounded-md p-3 mb-4">
                <p className="text-red-500 text-center text-sm">{updateError || localError}</p>
              </div>
            )}
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                  What&apos;s your full name?
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  required
                  disabled={isUpdating}
                  className="w-full h-12 bg-[#1e1e1e] border-[#333] text-white placeholder-gray-500 rounded-md"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-md mt-2"
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 