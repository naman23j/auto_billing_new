
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getPublicKey, isFreighterInstalled, getNetwork, getAccountDetails } from '../utils/stellar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface WalletContextType {
  isConnected: boolean;
  isLoading: boolean;
  publicKey: string | null;
  network: string | null;
  balances: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalances: () => Promise<void>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [balances, setBalances] = useState<Array<{ asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    console.log("Initiating wallet connection...");
    setIsLoading(true);
    setError(null);
    
    try {
      const connected = await isFreighterInstalled();
      if (!connected) {
        const errorMsg = "Freighter wallet is not installed. Please install the Freighter browser extension.";
        console.error(errorMsg);
        setError(errorMsg);
        toast({
          title: "Connection Failed",
          description: errorMsg,
          variant: "destructive"
        });
        return;
      }
      
      const key = await getPublicKey();
      const net = await getNetwork();
      
      console.log("Wallet connected successfully:", {
        publicKey: key.slice(0, 6) + "..." + key.slice(-4),
        network: net
      });
      
      setPublicKey(key);
      setNetwork(net);
      setIsConnected(true);
      
      toast({
        title: "Connected",
        description: "Wallet connected successfully!",
      });
      
      // Load balances
      await refreshBalances();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      console.error("Wallet connection error:", message);
      setError(message);
      toast({
        title: "Connection Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    console.log("Disconnecting wallet...");
    setIsConnected(false);
    setPublicKey(null);
    setNetwork(null);
    setBalances([]);
    setError(null);
    
    toast({
      title: "Disconnected",
      description: "Wallet disconnected successfully!",
    });
  };

  const refreshBalances = async () => {
    if (!publicKey) return;
    
    console.log("Refreshing wallet balances...");
    setIsLoading(true);
    
    try {
      const account = await getAccountDetails(publicKey);
      console.log("Account balances updated:", account.balances);
      setBalances(account.balances);
    } catch (err) {
      console.error("Error fetching balances:", err);
      if (err instanceof Error && err.message.includes("not found")) {
        // Account not funded or doesn't exist
        setBalances([{ asset_type: "native", balance: "0" }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        isLoading,
        publicKey,
        network,
        balances,
        connectWallet,
        disconnectWallet,
        refreshBalances,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
