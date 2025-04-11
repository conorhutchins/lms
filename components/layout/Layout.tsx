import React, { ReactNode } from 'react';
import Navbar from './NavBar'; 
import Footer from './Footer';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const showFooter = router.pathname !== '/signup' && router.pathname !== '/login';
  const isAuthPage = router.pathname === '/signup' || router.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <main className={`flex-1 ${isAuthPage ? 'flex items-center justify-center' : ''}`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;