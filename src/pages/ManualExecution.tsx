
import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { getAgreements, PaymentAgreement, executePayment } from '../utils/stellar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ZapIcon, 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

const ManualExecution: React.FC = () => {
  const { isConnected, publicKey } = useWallet();
  const [agreements, setAgreements] = useState<PaymentAgreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

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
      toast({
        title: "Error",
        description: "Failed to load your agreements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePayment = async (agreementId: string) => {
    setExecutingId(agreementId);
    try {
      const success = await executePayment(agreementId);
      
      if (success) {
        // Refresh the agreements list to get updated data
        await loadAgreements();
        
        toast({
          title: "Payment Successful",
          description: "The payment was executed successfully",
        });
      }
    } catch (error) {
      console.error("Error executing payment:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to execute payment",
        variant: "destructive"
      });
    } finally {
      setExecutingId(null);
    }
  };

  // Only active agreements can be executed
  const activeAgreements = agreements.filter(a => a.status === 'active');
  
  // Check which payments are due now
  const now = new Date();
  const duePayments = activeAgreements.filter(a => a.nextPaymentDate <= now);
  const upcomingPayments = activeAgreements.filter(a => a.nextPaymentDate > now);

  if (!isConnected) {
    return (
      <div className="container py-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to manually trigger payments
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Manual Payment Execution</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={loadAgreements}
          disabled={loading}
        >
          {loading ? (
            <RefreshCwIcon className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        This page allows you to manually trigger payments for testing. In a production environment, 
        these would be triggered automatically based on the schedule.
      </p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stellar-primary"></div>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4">Due Payments</h2>
          <p className="text-muted-foreground mb-6">
            These payments are currently due and can be executed immediately
          </p>
          
          {duePayments.length === 0 ? (
            <Card className="mb-8">
              <CardContent className="text-center py-12">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Payments Due</h3>
                <p className="text-muted-foreground">
                  You don't have any payments that are currently due
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 mb-8">
              {duePayments.map((agreement) => (
                <Card key={agreement.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          Payment to {agreement.recipient.slice(0, 6)}...{agreement.recipient.slice(-4)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {agreement.amount} {agreement.asset.code} • {agreement.frequency}
                        </p>
                      </div>
                      <Badge className="bg-red-500">Due Now</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Due Date</div>
                        <div className="flex items-center text-sm">
                          <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                          {format(new Date(agreement.nextPaymentDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Progress</div>
                        <div className="text-sm">
                          {agreement.cyclesCompleted} {agreement.cyclesTotal 
                            ? `/ ${agreement.cyclesTotal}` 
                            : ''} payments made
                        </div>
                      </div>
                      
                      <div className="flex items-end justify-end">
                        <Button
                          onClick={() => handleExecutePayment(agreement.id)}
                          disabled={executingId === agreement.id}
                          className="bg-stellar-primary hover:bg-stellar-dark"
                        >
                          {executingId === agreement.id ? (
                            <>
                              <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ZapIcon className="mr-2 h-4 w-4" />
                              Execute Now
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <h2 className="text-2xl font-bold mb-4">Upcoming Payments</h2>
          <p className="text-muted-foreground mb-6">
            These payments are scheduled for the future but can be executed early for testing
          </p>
          
          {upcomingPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircleIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Upcoming Payments</h3>
                <p className="text-muted-foreground">
                  You don't have any upcoming scheduled payments
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingPayments.map((agreement) => (
                <Card key={agreement.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          Payment to {agreement.recipient.slice(0, 6)}...{agreement.recipient.slice(-4)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {agreement.amount} {agreement.asset.code} • {agreement.frequency}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-blue-500 border-blue-500">
                        Upcoming
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Next Payment</div>
                        <div className="flex items-center text-sm">
                          <ClockIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                          {format(new Date(agreement.nextPaymentDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Progress</div>
                        <div className="text-sm">
                          {agreement.cyclesCompleted} {agreement.cyclesTotal 
                            ? `/ ${agreement.cyclesTotal}` 
                            : ''} payments made
                        </div>
                      </div>
                      
                      <div className="flex items-end justify-end">
                        <Button
                          variant="outline"
                          onClick={() => handleExecutePayment(agreement.id)}
                          disabled={executingId === agreement.id}
                        >
                          {executingId === agreement.id ? (
                            <>
                              <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ZapIcon className="mr-2 h-4 w-4" />
                              Execute Early
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManualExecution;
