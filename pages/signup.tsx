import { createClient } from '../src/lib/supabase/client'
import { useState, FormEvent } from 'react'
import { Button } from "../src/components/ui/button"
import { Input } from "../src/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../src/components/ui/card"
import Link from 'next/link'
import Image from 'next/image'

export default function SignUpPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleOAuthSignUp = async (provider: 'google' | 'facebook') => {
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
    }
  }

  const handleEmailSignUp = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for the confirmation link!')
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-var(--navbar-height))] w-full bg-black text-white p-4 box-border">
      <Card className="w-full max-w-md mx-auto bg-[#111111] border-0 shadow-lg my-12">
        <CardHeader className="text-center pt-10 pb-6">
          <div className="flex justify-center items-center mb-6">
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
          <CardTitle className="text-2xl font-normal text-white">Create your account</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          {error && (
            <p className="text-red-500 text-center text-sm mb-4">{error}</p>
          )}
          {message && (
            <p className="text-green-500 text-center text-sm mb-4">{message}</p>
          )}
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333] text-white rounded-md"
              onClick={() => handleOAuthSignUp('google')}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107"/>
                <path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"/>
                <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50"/>
                <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"/>
              </svg>
              <span className="ml-2">Google</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#333] text-white rounded-md"
              onClick={() => handleOAuthSignUp('facebook')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" />
              </svg>
              <span className="ml-2">Facebook</span> 
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
                  className="w-full h-12 bg-[#1e1e1e] border-[#333] text-white placeholder-gray-500 rounded-md"
                  minLength={6} 
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-md mt-2"
              >
                Create account
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