// components/layout/Footer.tsx
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="bg-muted py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Last Man Standing</h3>
            <p className="text-muted-foreground">
              The ultimate football prediction competition where only one can remain.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link></li>
              <li><Link href="/competitions" className="text-muted-foreground hover:text-foreground">Competitions</Link></li>
              <li><Link href="/rules" className="text-muted-foreground hover:text-foreground">Rules</Link></li>
              <li><Link href="/faq" className="text-muted-foreground hover:text-foreground">FAQ</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Contact Us</h3>
            <p className="text-muted-foreground">
              Have questions? Email us at <a href="mailto:info@lastmanstanding.com" className="underline">info@lastmanstanding.com</a>
            </p>
          </div>
        </div>
        
        <Separator className="my-8" />
        
        <div className="text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Last Man Standing. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}