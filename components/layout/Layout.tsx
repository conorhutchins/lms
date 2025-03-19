import React, { ReactNode } from 'react';
import Navbar from './NavBar'; 
import Footer from './Footer';

// this just allows us to have a navbar and footer on every page and pass in the children with props
interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
};

export default Layout;