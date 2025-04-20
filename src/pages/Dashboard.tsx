
import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { getAgreements, PaymentAgreement } from '../utils/stellar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import TransactionHistory from '@/components/TransactionHistory';
import { 
  CalendarClockIcon, 
  PlusIcon, 
  ZapIcon, 
  AlertTriangleIcon,
  WalletIcon,
  CreditCardIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  RefreshCwIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { isConnected, publicKey, balances, isLoading, refreshBalances } = useWallet();
  const [agreements, setAgreements] = useState<PaymentAgreement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && publicKey) {
      loadAgreements();
    }
  }, [isConnected, publicKey]);

  const loadAgreements = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const userAgreements = await getAgreements(publicKey);
      setAgreements(userAgreements);
    } catch (error) {
      console.error("Error loading agreements:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeAgreements = agreements.filter(a => a.status === 'active');
  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(now.getDate() + 3);
  const upcomingPayments = activeAgreements.filter(a => 
    a.nextPaymentDate > now && a.nextPaymentDate <= threeDaysFromNow
  );

  const totalBalance = balances.reduce((acc, balance) => {
    if (balance.asset_type === 'native') {
      return acc + parseFloat(balance.balance);
    }
    return acc;
  }, 0);

  const handleRefreshWallet = async () => {
    await refreshBalances();
  };

  const WelcomeSection = () => (
    <div className="text-center space-y-6 max-w-3xl mx-auto py-12">
      <motion.h1 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-4xl font-bold mb-4 typewriter"
      >
        Welcome to Stellar Flow Finance
      </motion.h1>
      <p className="text-lg text-muted-foreground mb-8">
        Your gateway to automated recurring payments on the Stellar Network
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Automated Payments</CardTitle>
          </CardHeader>
          <CardContent>
            Set up recurring payments with ease
          </CardContent>
        </Card>
        <Card className="p-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Smart Scheduling</CardTitle>
          </CardHeader>
          <CardContent>
            Define custom payment schedules
          </CardContent>
        </Card>
        <Card className="p-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Full Control</CardTitle>
          </CardHeader>
          <CardContent>
            Manage all your payment agreements
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="container py-6 space-y-8">
      {!isConnected ? (
        <WelcomeSection />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
            >
              <h1 className="text-4xl font-bold typewriter">
                Stellar Flow Finance
              </h1>
              <p className="text-muted-foreground">
                Automate your recurring payments on the Stellar Network
              </p>
              {publicKey && (
                <p className="text-sm text-muted-foreground">
                  Connected Wallet: {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
                </p>
              )}
            </motion.div>
            <Link to="/create">
              <Button size="sm">
                <PlusIcon className="h-4 w-4 mr-1" />
                New Payment
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="dashboard-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <WalletIcon className="h-5 w-5 text-stellar-primary" />
                      <CardTitle className="text-lg">Wallet Balance</CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleRefreshWallet} 
                      className="h-8 w-8"
                      disabled={isLoading}
                    >
                      <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <CardDescription>Current total in XLM</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stellar-primary">
                    {totalBalance.toFixed(2)} XLM
                  </div>
                  {balances.map((balance, index) => (
                    <div key={index} className="mt-2 text-sm text-muted-foreground">
                      {balance.asset_code || (balance.asset_type === 'native' ? 'XLM' : balance.asset_type)}:
                      {' '}{parseFloat(balance.balance).toFixed(2)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="dashboard-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <CreditCardIcon className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Active Payments</CardTitle>
                  </div>
                  <CardDescription>Running payment agreements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {activeAgreements.length}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {upcomingPayments.length} payments due soon
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="dashboard-card auto-billing-card bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUpIcon className="h-5 w-5 text-white" />
                    <CardTitle className="text-lg text-white">Auto-Billing</CardTitle>
                  </div>
                  <CardDescription className="text-white/80">Automated payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    Active
                  </div>
                  <p className="mt-2 text-sm text-white/80">
                    Next automatic payment in {upcomingPayments.length > 0 ? format(new Date(upcomingPayments[0].nextPaymentDate), 'dd MMM') : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="dashboard-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-5 w-5 text-stellar-accent" />
                    <CardTitle className="text-lg">Security Status</CardTitle>
                  </div>
                  <CardDescription>Transaction protection</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stellar-accent">
                    Protected
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    All transactions are secure
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Transaction History</h2>
            <TransactionHistory />
          </div>

          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stellar-primary"></div>
            </div>
          ) : agreements.length > 0 ? (
            <div className="grid gap-4">
              {agreements.slice(0, 5).map((agreement) => (
                <Card key={agreement.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          agreement.status === 'active' ? 'bg-green-100' : 
                          agreement.status === 'paused' ? 'bg-amber-100' : 
                          agreement.status === 'completed' ? 'bg-blue-100' : 
                          'bg-red-100'
                        }`}>
                          <CalendarClockIcon className={`h-5 w-5 ${
                            agreement.status === 'active' ? 'text-green-600' : 
                            agreement.status === 'paused' ? 'text-amber-600' : 
                            agreement.status === 'completed' ? 'text-blue-600' : 
                            'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium">
                            Payment to {agreement.recipient.slice(0, 6)}...{agreement.recipient.slice(-4)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {agreement.amount} {agreement.asset.code} • {agreement.frequency}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Next payment: {agreement.status === 'active' 
                            ? format(new Date(agreement.nextPaymentDate), 'MMM d, yyyy')
                            : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agreement.cyclesTotal 
                            ? `${agreement.cyclesCompleted}/${agreement.cyclesTotal} payments made` 
                            : `${agreement.cyclesCompleted} payments made`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {agreements.length > 5 && (
                <div className="text-center mt-2">
                  <Link to="/manage">
                    <Button variant="ghost" size="sm">
                      View All Agreements
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Card className="py-6">
              <CardContent className="text-center py-8">
                <ZapIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Payment Agreements</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't created any recurring payment agreements yet.
                </p>
                <Link to="/create">
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create New Agreement
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
          
          {upcomingPayments.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Upcoming Payments</h2>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <AlertTriangleIcon className="h-5 w-5 text-amber-500 mr-2" />
                    <CardTitle className="text-lg">Payment Reminders</CardTitle>
                  </div>
                  <CardDescription>These payments are coming up in the next 3 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingPayments.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <div>
                          <div className="font-medium">
                            {payment.amount} {payment.asset.code} to {payment.recipient.slice(0, 6)}...{payment.recipient.slice(-4)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.frequency} payment
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Due: {format(new Date(payment.nextPaymentDate), 'MMM d, yyyy')}
                          </div>
                          <Link to="/execute">
                            <Button size="sm" variant="outline" className="mt-1">
                              <ZapIcon className="h-3 w-3 mr-1" />
                              Execute Now
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
