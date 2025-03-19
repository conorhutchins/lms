import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import HowItWorks from './HowItWorks';

export default function SignUpSection() {
  const [email, setEmail] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn('email', { email, callbackUrl: '/dashboard' });
  };
  
  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight gradient-heading sm:text-4xl">
            Ready to join the competition?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sign up now to participate in our Last Man Standing competition and compete for the prize pool.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <Image 
              src="/images/football-action.png" 
              alt="Football action" 
              width={600} 
              height={400}
              className="rounded-lg shadow-lg"
            />
          </div>
          
          <div className="md:w-1/2">
            <Card className="card-hover border-primary/10">
              <CardHeader className="bg-primary/5 rounded-t-lg">
                <CardTitle className="text-3xl font-sora text-primary">Ready to Compete?</CardTitle>
                <CardDescription className="text-lg">
                  Entry is just £10 and you could win the entire pot!
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium leading-6">
                      Email address
                    </label>
                    <div className="mt-2">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-md border-0 py-2 px-3.5 shadow-sm ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Button 
                      type="submit"
                      size="lg" 
                      className="w-full signup-button"
                    >
                      Sign Up Now
                    </Button>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Or continue with
                  </div>
                  
                  <div>
                    <button
                      type="button"
                      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                      className="flex w-full justify-center items-center gap-2 rounded-md border border-input bg-white px-3.5 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-primary"
                    >
                      <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                        <path
                          d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                          fill="#EA4335"
                        />
                        <path
                          d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                          fill="#4285F4"
                        />
                        <path
                          d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                          fill="#34A853"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                </form>
                <p className="mt-6 mb-2 text-center text-muted-foreground">
                  Make your predictions each week and advance through the rounds. 
                  Join a community of contenders and prove your skills!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <HowItWorks />
    </section>
  );
}