
import { useQuery } from '@tanstack/react-query';
import { server } from '@/utils/stellar';
import { useWallet } from '@/context/WalletContext';

export interface Transaction {
  type: 'sent' | 'received';
  amount: string;
  asset: string;
  date: Date;
  from: string;
  to: string;
  memo?: string;
}

export const useTransactionHistory = () => {
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['transactions', publicKey],
    queryFn: async (): Promise<Transaction[]> => {
      if (!publicKey) throw new Error('Wallet not connected');

      const transactions = await server.transactions()
        .forAccount(publicKey)
        .order('desc')
        .limit(10)
        .call();

      // First, get all operations for all transactions in parallel
      const operationsPromises = transactions.records.map(tx => 
        tx.operations().then(({ records }) => {
          return records
            .filter(op => op.type === 'payment')
            .map(op => ({
              // Explicitly cast the type to our union type
              type: op.from === publicKey ? 'sent' as const : 'received' as const,
              amount: op.amount,
              asset: op.asset_type === 'native' ? 'XLM' : op.asset_code,
              date: new Date(tx.created_at),
              from: op.from,
              to: op.to,
              memo: tx.memo || undefined
            }));
        })
      );

      // Wait for all operations to resolve and flatten the results
      const operationsArrays = await Promise.all(operationsPromises);
      return operationsArrays.flat();
    },
    enabled: !!publicKey
  });
};
