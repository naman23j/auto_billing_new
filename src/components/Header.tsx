
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { Button } from '@/components/ui/button';
import { WalletIcon, LayoutDashboardIcon, CalendarClockIcon, ClipboardCheckIcon, ZapIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { motion } from 'framer-motion';

const Header: React.FC = () => {
  const location = useLocation();
  const { isConnected, connectWallet, disconnectWallet, isLoading: walletLoading, publicKey, network } = useWallet();

  const truncatedAddress = publicKey 
    ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`
    : '';

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-bold text-xl flex items-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ZapIcon className="mr-2 h-6 w-6" />
            </motion.div>
            <span>Stellar Flow</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-4 ml-4">
            {[
              { path: '/', icon: LayoutDashboardIcon, label: 'Dashboard' },
              { path: '/create', icon: CalendarClockIcon, label: 'Create Payment' },
              { path: '/manage', icon: ClipboardCheckIcon, label: 'Manage Agreements' },
              { path: '/execute', icon: ZapIcon, label: 'Manual Execution' },
            ].map(({ path, icon: Icon, label }) => (
              <motion.div
                key={path}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  to={path} 
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center ${
                    location.pathname === path ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="mr-1 h-4 w-4" />
                  {label}
                </Link>
              </motion.div>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {isConnected ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex flex-col text-right text-sm">
                <span className="font-medium">{truncatedAddress}</span>
                <span className="text-muted-foreground text-xs">{network}</span>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={disconnectWallet}
                >
                  <WalletIcon className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={connectWallet} 
                disabled={walletLoading}
              >
                <WalletIcon className="mr-2 h-4 w-4" />
                {walletLoading ? "Connecting..." : "Connect Wallet"}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
