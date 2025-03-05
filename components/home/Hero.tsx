// components/home/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <div className="bg-primary text-primary-foreground py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-sora">
              Could you be the Last Man Standing?
            </h1>
            <p className="text-xl md:text-2xl mb-6 text-primary-foreground/80">
              Join the ultimate showdown where only one can remain.
        
            </p>
            <div className="space-x-4">
              <Button asChild size="lg" variant="secondary" className="bg-[#A855F7] hover:bg-[#9333EA] text-white px-8 py-4">
                <Link href="/competitions">Join the Battle</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#A855F7] text-[#A855F7] hover:bg-[#A855F7]/10 px-8 py-4">
                <Link href="/rules">Learn More</Link>
              </Button>
            </div>
          </div>
          <div className="md:w-1/2">
            <Image 
              src="/images/hero-image.png" 
              alt="Last Man Standing Logo" 
              width={800}
              height={600}
              className="rounded-lg shadow-lg w-full h-auto"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}