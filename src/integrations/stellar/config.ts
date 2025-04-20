import { Network } from '@stellar/stellar-sdk';

// Get environment variables
const STELLAR_NETWORK = import.meta.env.VITE_STELLAR_NETWORK || process.env.STELLAR_NETWORK || 'testnet';
const FREIGHTER_ALLOWED_DOMAINS = import.meta.env.VITE_FREIGHTER_ALLOWED_DOMAINS || process.env.FREIGHTER_ALLOWED_DOMAINS || 'http://localhost:5173';

// Validate network
if (STELLAR_NETWORK !== 'testnet' && STELLAR_NETWORK !== 'public') {
  throw new Error('Invalid STELLAR_NETWORK value. Must be either "testnet" or "public"');
}

// Configure Stellar network
export const network = STELLAR_NETWORK === 'testnet' ? Network.TESTNET : Network.PUBLIC;

// Configure Freighter
export const freighterConfig = {
  allowedDomains: FREIGHTER_ALLOWED_DOMAINS.split(',').map(domain => domain.trim()),
};

// Export network type for type checking
export type NetworkType = 'testnet' | 'public'; 