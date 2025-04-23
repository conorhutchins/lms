import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useSupabase } from '../lib/context/SupabaseContext'
import { Button } from "../src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../src/components/ui/card"
import Image from 'next/image'
import { Competition } from '../lib/types/competition'
import { useCompetitions } from '../lib/hooks/data/useCompetitions'
import { useUserProfile } from '../lib/hooks/data/useUserProfile'

export default function HubPage() {
  const router = useRouter()
  const { supabase, session } = useSupabase()
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const { userProfile, loading: profileLoading, error: profileError } = useUserProfile()
  const { competitions, loading: competitionsLoading, error: competitionsError } = useCompetitions()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!profileLoading && !competitionsLoading && !session) {
      console.log('Hub: No session found after loading, redirecting to login.')
      router.replace('/login?error=not_authenticated')
    }
  }, [session, profileLoading, competitionsLoading, router])

  const handleSignOut = async () => {
    try {
      setSignOutLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
      } else {
        console.log('Signed out successfully, redirecting to home.')
      }
      
      router.push('/')
    } catch (err) {
      console.error('Exception during sign out:', err)
      router.push('/')
    } finally {
      setSignOutLoading(false)
    }
  }

  const isLoading = profileLoading || competitionsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        {isMounted ? (
          <div className="text-white text-center">
            <div className="w-10 h-10 border-4 border-t-purple-500 border-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300">Loading your dashboard...</p>
          </div>
        ) : (
          <p className="text-white">Loading your dashboard...</p>
        )}
      </div>
    )
  }

  if (profileError) {
    return <div className="text-red-500 text-center p-4">Error loading profile: {profileError}</div>
  }
  if (competitionsError) {
    return <div className="text-red-500 text-center p-4">Error loading competitions: {competitionsError}</div>
  }

  if (!session) {
    return <div className="text-white text-center p-4">Please log in to view your hub.</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      <Card className="bg-[#111111] border-0 shadow-lg">
        <CardHeader className="text-center pt-10 pb-6">
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden">
              <Image 
                src="/images/lastManStandingLogo.jpeg" 
                alt="Last Man Standing HQ" 
                fill
                style={{ 
                  objectFit: "cover",
                  borderRadius: "50%"
                }}
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-normal text-white">Welcome to your Last Man Standing HQ</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <div className="space-y-6">
            <div className="bg-[#1e1e1e] p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">Your Information</h3>
              <p className="text-gray-300">Email: {session.user.email}</p>
              <p className="text-gray-300 text-xs mt-2">User ID: {session.user.id}</p>
              {userProfile?.name && <p className="text-gray-300">Name: {userProfile.name}</p>}
            </div>
            
            <div className="bg-[#1e1e1e] p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">Check out our public competitions</h3>
              <div className="mt-3">
                <Link href="/competitions/sport/football" passHref>
                  <Button 
                    variant="secondary"
                    className="h-10 bg-purple-600 hover:bg-purple-700 border-0 text-white"
                  >
                    Football
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-[#1e1e1e] p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">Active Competitions</h3>
              {competitions && competitions.length > 0 ? (
                <ul className="space-y-2">
                  {competitions.map((comp: Competition) => (
                    <li key={comp.id} className="text-gray-300">
                      {comp.title} - {comp.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-300">You have no active competitions.</p>
              )}
            </div>

            <div className="bg-[#1e1e1e] p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">Recent Activity</h3>
              <p className="text-gray-300">No recent activity to display.</p>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                className="h-10 bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333] text-white"
                onClick={handleSignOut}
                disabled={signOutLoading}
              >
                {signOutLoading ? 'Signing out...' : 'Sign Out'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 