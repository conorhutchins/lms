import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useSupabase } from '../lib/context/SupabaseContext'
import { useAuthActions } from '../lib/hooks/auth/useAuthActions'
import { Button } from "../src/components/ui/button"
import { Input } from "../src/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../src/components/ui/card"
import Image from 'next/image'

export default function SignUpPage() {
  const { session } = useSupabase();
  const {
    loading,
    error,
    message,
    signUpWithPassword,
    signInWithOAuth,
    setError
  } = useAuthActions();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (session) {
      setIsRedirecting(true);
      router.replace('/hub'); 
    }
  }, [session, router]);

  useEffect(() => {
    if (router.query.error && !error) {
      const errorMsg = decodeURIComponent(router.query.error as string);
      setError(errorMsg);
      
      const newQuery = { ...router.query };
      delete newQuery.error;
      router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
    }
  }, [router.query, router, error, setError]);

  const handleOAuthSignUp = async (provider: 'google') => {
    await signInWithOAuth(provider);
  };

  const handleEmailSignUp = async (event: FormEvent) => {
    event.preventDefault();
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    await signUpWithPassword(email, password);
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        {isMounted ? (
          <div className="text-white text-center">
            <div className="w-10 h-10 border-4 border-t-purple-500 border-white rounded-full animate-spin mx-auto mb-4"></div>
            <p>Redirecting...</p>
          </div>
        ) : (
          <p className="text-white">Redirecting...</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card className="bg-[#111111] border-0 shadow-lg">
        <CardHeader className="text-center pt-10 pb-6">
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden">
              <Image 
                src="/images/lastManStandingLogo.jpeg" 
                alt="Last Man Standing HQ" 
                fill
                style={{ objectFit: "cover", borderRadius: "50%" }}
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-normal text-white">Create your account</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-md p-3 mb-4">
              <p className="text-red-500 text-center text-sm">{error}</p>
            </div>
          )}
          {message && (
            <div className="bg-green-900/20 border border-green-800 rounded-md p-3 mb-4">
              <p className="text-green-500 text-center text-sm">{message}</p>
            </div>
          )}
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-12 flex items-center justify-center bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333] text-white"
              onClick={() => handleOAuthSignUp('google')}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107"/>
                <path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"/>
                <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50"/>
                <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"/>
              </svg>
              <span className="ml-2">Sign up with Google</span>
            </Button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#333]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#111111] px-4 text-[#666] text-xs uppercase tracking-wider">
                  OR CONTINUE WITH EMAIL
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-12 bg-[#1e1e1e] border-[#333] text-white placeholder-gray-500 rounded-md"
                />
              </div>
              <div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-12 bg-[#1e1e1e] border-[#333] text-white placeholder-gray-500 rounded-md"
                  minLength={8}
                />
                <p className="text-gray-500 text-xs mt-1">Password must be at least 8 characters</p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-md mt-2"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="text-center mt-8">
                <p className="text-[#888]">
                    Already have an account?{" "}
                    <Link href="/login" className="text-white hover:text-purple-400 ml-1">
                        Sign in →
                    </Link>
                </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 