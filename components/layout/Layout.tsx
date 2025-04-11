import React, { ReactNode } from 'react';
import Navbar from './NavBar'; 
import Footer from './Footer';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const showFooter = router.pathname !== '/signup';

  return (
    <>
      <Navbar />
      <main>{children}</main>
      {showFooter && <Footer />}
    </>
  );
};

export default Layout;