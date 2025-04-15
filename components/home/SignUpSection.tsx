// components/home/SignUpSection.tsx
import { handleOAuthSignIn, type AuthProvider } from '@/lib/supabase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

export default function SignUpSection() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (provider: AuthProvider) => {
    try {
      setIsLoading(true);
      const { success, error, url } = await handleOAuthSignIn(provider);
      
      if (!success || !url) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: error || "Failed to initiate sign in"
        });
        return;
      }

      window.location.href = url;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <Image 
              src="/images/football-action.png" 
              alt="Football action" 
              width={600} 
              height={400}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2 md:pl-12">
            <Card className="border-0 shadow-l bg-transparent">
              <CardHeader>
                <CardTitle className="text-3xl font-sora">Ready to Compete?</CardTitle>
                <CardDescription className="text-lg text-white">
                  Entry is just £10 and you could win the entire pot!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-6">
                  Make your predictions each week and advance through the rounds. 
                  Join a community of contenders and prove your skills!
                </p>
                <Button 
                  onClick={() => handleSignUp('google')} 
                  disabled={isLoading}
                  size="lg" 
                  className="bg-[#A855F7] hover:bg-[#9333EA] text-white px-8 py-4 w-full"
                >
                  {isLoading ? 'Connecting...' : 'Sign Up with Google'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}