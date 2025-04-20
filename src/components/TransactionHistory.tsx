
import React from 'react';
import { ArrowDownIcon, ArrowUpIcon, Loader2Icon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { useWallet } from '@/context/WalletContext';

const TransactionHistory: React.FC = () => {
  const { isConnected } = useWallet();
  const { data: transactions, isLoading, error } = useTransactionHistory();

  if (!isConnected) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        Connect your wallet to view transaction history
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 flex justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-red-500">
        Error loading transactions
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        No transactions found
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="hidden md:table-cell">From</TableHead>
            <TableHead className="hidden md:table-cell">To</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="hidden md:table-cell">Memo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx, index) => (
            <TableRow key={index} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-2">
                  {tx.type === 'sent' ? (
                    <ArrowUpIcon className="h-4 w-4 text-red-500" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-green-500" />
                  )}
                  {tx.type}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                {tx.amount} {tx.asset}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {tx.from.slice(0, 6)}...{tx.from.slice(-6)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {tx.to.slice(0, 6)}...{tx.to.slice(-6)}
              </TableCell>
              <TableCell>
                {format(tx.date, 'MMM d, HH:mm')}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {tx.memo || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionHistory;
