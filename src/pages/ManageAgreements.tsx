
import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { getAgreements, PaymentAgreement, updateAgreementStatus } from '../utils/stellar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  PlayIcon, 
  PauseIcon, 
  XIcon, 
  RefreshCwIcon, 
  CalendarIcon,
  ClockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ZapIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

const ManageAgreements: React.FC = () => {
  const { isConnected, publicKey } = useWallet();
  const [agreements, setAgreements] = useState<PaymentAgreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleStatusChange = async (agreementId: string, status: 'active' | 'paused' | 'cancelled') => {
    setActionLoading(agreementId);
    try {
      await updateAgreementStatus(agreementId, status);
      
      // Update local state
      setAgreements(agreements.map(agreement => 
        agreement.id === agreementId ? { ...agreement, status } : agreement
      ));
      
      const statusText = 
        status === 'active' ? 'activated' : 
        status === 'paused' ? 'paused' : 'cancelled';
      
      toast({
        title: "Status Updated",
        description: `The agreement has been ${statusText}`,
      });
    } catch (error) {
      console.error("Error updating agreement status:", error);
      toast({
        title: "Error",
        description: `Failed to update agreement status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const activeAgreements = agreements.filter(a => a.status === 'active');
  const pausedAgreements = agreements.filter(a => a.status === 'paused');
  const completedAgreements = agreements.filter(a => 
    a.status === 'completed' || a.status === 'cancelled'
  );

  if (!isConnected) {
    return (
      <div className="container py-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to manage your agreements
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'paused':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Paused</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const renderAgreementsList = (items: PaymentAgreement[]) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
            <AlertCircleIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No Agreements Found</h3>
          <p className="text-muted-foreground mt-2">
            There are no agreements in this category.
          </p>
        </div>
      );
    }

    return items.map((agreement) => (
      <Card key={agreement.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">
                Payment to {agreement.recipient.slice(0, 6)}...{agreement.recipient.slice(-4)}
              </CardTitle>
              <CardDescription>
                {agreement.amount} {agreement.asset.code} • {agreement.frequency}
              </CardDescription>
            </div>
            {getStatusBadge(agreement.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Start Date</div>
                <div className="flex items-center text-sm">
                  <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                  {format(new Date(agreement.startDate), 'MMM d, yyyy')}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Next Payment</div>
                <div className="flex items-center text-sm">
                  <ClockIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                  {agreement.status === 'active' 
                    ? format(new Date(agreement.nextPaymentDate), 'MMM d, yyyy')
                    : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Progress</div>
                <div className="text-sm">
                  {agreement.cyclesCompleted} {agreement.cyclesTotal 
                    ? `/ ${agreement.cyclesTotal}` 
                    : ''} payments made
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Last Payment</div>
                <div className="text-sm">
                  {agreement.lastPaymentDate 
                    ? format(new Date(agreement.lastPaymentDate), 'MMM d, yyyy')
                    : 'No payments yet'}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end space-x-2">
              {agreement.status === 'active' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(agreement.id, 'paused')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === agreement.id ? (
                      <RefreshCwIcon className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <PauseIcon className="mr-1 h-4 w-4" />
                    )}
                    Pause
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleStatusChange(agreement.id, 'cancelled')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === agreement.id ? (
                      <RefreshCwIcon className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <XIcon className="mr-1 h-4 w-4" />
                    )}
                    Cancel
                  </Button>
                </>
              )}
              
              {agreement.status === 'paused' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(agreement.id, 'active')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === agreement.id ? (
                      <RefreshCwIcon className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayIcon className="mr-1 h-4 w-4" />
                    )}
                    Resume
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleStatusChange(agreement.id, 'cancelled')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === agreement.id ? (
                      <RefreshCwIcon className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <XIcon className="mr-1 h-4 w-4" />
                    )}
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Manage Agreements</h1>
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

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stellar-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="relative">
              Active
              {activeAgreements.length > 0 && (
                <span className="ml-1 text-xs inline-flex items-center justify-center rounded-full bg-stellar-primary w-5 h-5 text-white">
                  {activeAgreements.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="paused">
              Paused
              {pausedAgreements.length > 0 && (
                <span className="ml-1 text-xs inline-flex items-center justify-center rounded-full bg-amber-500 w-5 h-5 text-white">
                  {pausedAgreements.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed/Cancelled
              {completedAgreements.length > 0 && (
                <span className="ml-1 text-xs inline-flex items-center justify-center rounded-full bg-muted w-5 h-5 text-muted-foreground">
                  {completedAgreements.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {renderAgreementsList(activeAgreements)}
          </TabsContent>
          
          <TabsContent value="paused">
            {renderAgreementsList(pausedAgreements)}
          </TabsContent>
          
          <TabsContent value="completed">
            {renderAgreementsList(completedAgreements)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ManageAgreements;
