import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: "Sign Up & Pay",
      description: "Register for an account and pay the £10 entry fee to join the competition."
    },
    {
      number: 2,
      title: "Pick Your Team",
      description: "Each week, select one team you think will win their match. You can only pick each team once!"
    },
    {
      number: 3,
      title: "Be The Last Standing",
      description: "If your team wins, you advance to the next round. If they lose or draw, you're out! Last person standing wins the prize pot."
    }
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold gradient-heading">Rules Of Engagement</h2>
          <p className="mt-4 text-lg text-muted-foreground">Follow these simple steps to join the competition.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <Card key={step.number} className="text-center border-none">
              <CardHeader>
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                  {step.number}
                </div>
                <CardTitle className="mt-4 text-primary">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <Card className="max-w-md mx-auto border-none bg-[#111111] shadow-md">
            <CardHeader>
              <CardTitle>Private Competitions</CardTitle>
              <CardDescription>
                Want to play with just your friends?
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center py-6">
              <Button asChild variant="secondary" className="signup-button !bg-secondary !text-secondary-foreground hover:!bg-secondary/80">
                <Link href="/competitions/create">Create Private Competition</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}