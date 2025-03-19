import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  const { data: session } = useSession();
  
  return (
    <nav className="border-b border-border/40 bg-card/50">
      <div className="container mx-auto flex justify-between items-center py-4">
        <Link href="/" className="text-2xl font-bold text-foreground hover:text-foreground/90 transition-colors">
          Last Man Standing.
        </Link>
        
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink className="px-4 py-2 hover:text-primary">
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/competitions" legacyBehavior passHref>
                <NavigationMenuLink className="px-4 py-2 hover:text-primary">
                  Competitions
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            
            {session ? (
              <>
                <NavigationMenuItem>
                  <Link href="/dashboard" legacyBehavior passHref>
                    <NavigationMenuLink className="px-4 py-2 hover:text-primary">
                      Dashboard
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 hover:bg-primary/20">
                        <Avatar className="h-8 w-8 border border-primary/30">
                          <AvatarImage src={session.user?.image || ''} alt={session.user?.name || 'User'} />
                          <AvatarFallback className="bg-primary/20 text-primary">{session.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <span>{session.user?.name || 'Account'}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href="/profile">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => signOut()}>
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>
              </>
            ) : (
              <NavigationMenuItem>
                <Button onClick={() => signIn()} className="bg-primary hover:bg-primary/80">
                  Sign In
                </Button>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </nav>
  );
}