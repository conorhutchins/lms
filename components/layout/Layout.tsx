// components/layout/Layout.tsx
import Navbar from './NavBar';
import Footer from './Footer';
import { ReactNode } from 'react';
import { ThemeProvider } from "../../components/theme-provider";

interface LayoutProps {
  children: ReactNode;
}


export default function Layout({ children }: LayoutProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}