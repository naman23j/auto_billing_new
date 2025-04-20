
import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { WalletProvider } from '../context/WalletContext';
import { ThemeProvider } from 'next-themes';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WalletProvider>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen flex flex-col bg-background transition-colors duration-300"
        >
          <Header />
          <motion.main 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex-1"
          >
            {children}
          </motion.main>
          <Footer />
        </motion.div>
      </WalletProvider>
    </ThemeProvider>
  );
};

export default Layout;
