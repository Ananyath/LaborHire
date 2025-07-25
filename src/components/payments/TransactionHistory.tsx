import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Smartphone, 
  Building, 
  Banknote,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface Payment {
  id: string;
  payer_id: string;
  payee_id: string;
  job_id?: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  transaction_reference?: string;
  payment_details?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  payer_profile: {
    id: string;
    full_name: string;
    profile_photo_url?: string;
  };
  payee_profile: {
    id: string;
    full_name: string;
    profile_photo_url?: string;
  };
  job?: {
    title: string;
  };
}

interface TransactionHistoryProps {
  className?: string;
}

export const TransactionHistory = ({ className }: TransactionHistoryProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (profile?.id) {
      fetchPayments();
      setupRealtimeSubscription();
    }
  }, [profile]);

  useEffect(() => {
    filterPayments();
  }, [payments, filter]);

  const setupRealtimeSubscription = () => {
    if (!profile?.id) return;
    
    console.log('Setting up real-time subscription for payments...');
    
    const channel = supabase
      .channel('payment-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('Payment change detected:', payload);
          
          // Check if the payment involves the current user
          const paymentData = payload.new as any;
          if (paymentData && (paymentData.payer_id === profile.id || paymentData.payee_id === profile.id)) {
            console.log('Payment involves current user, refreshing...');
            // Debounce the refresh to avoid multiple rapid calls
            setTimeout(() => {
              fetchPayments();
            }, 500);
          }
        }
      )
      .subscribe((status) => {
        console.log('Payment subscription status:', status);
      });

    return () => {
      console.log('Cleaning up payment subscription...');
      supabase.removeChannel(channel);
    };
  };

  const fetchPayments = async () => {
    if (!profile?.id) return;

    try {
      console.log('Fetching payments for user:', profile.id);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          payer_profile:profiles!payments_payer_id_fkey(
            id,
            full_name,
            profile_photo_url
          ),
          payee_profile:profiles!payments_payee_id_fkey(
            id,
            full_name,
            profile_photo_url
          ),
          job:jobs(title)
        `)
        .or(`payer_id.eq.${profile.id},payee_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched payments:', data?.length || 0);
      setPayments((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transaction history.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];
    
    switch (filter) {
      case 'sent':
        filtered = filtered.filter(payment => payment.payer_id === profile?.id);
        break;
      case 'received':
        filtered = filtered.filter(payment => payment.payee_id === profile?.id);
        break;
      case 'pending':
        filtered = filtered.filter(payment => payment.payment_status === 'pending');
        break;
      case 'completed':
        filtered = filtered.filter(payment => payment.payment_status === 'completed');
        break;
      default:
        // 'all' - no filtering
        break;
    }
    
    setFilteredPayments(filtered);
  };

  const markPaymentAsCompleted = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'completed' })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: 'Payment Completed',
        description: 'Payment has been marked as completed.',
      });

      // No need to manually refresh as real-time subscription will handle it
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment status.',
        variant: 'destructive',
      });
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'esewa':
      case 'khalti':
        return Smartphone;
      case 'bank':
        return Building;
      case 'cash':
        return Banknote;
      default:
        return CreditCard;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'pending':
        return Clock;
      case 'failed':
        return XCircle;
      case 'cancelled':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount).replace('₹', 'रु ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>Transaction History</span>
            </CardTitle>
            <CardDescription>
              View your payment transactions and history
            </CardDescription>
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No transactions found</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'No payment transactions yet.'
                : `No ${filter} transactions found.`
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredPayments.map((payment) => {
                const isReceived = payment.payee_id === profile?.id;
                const isTopUp = payment.payer_id === payment.payee_id;
                const otherProfile = isTopUp ? payment.payer_profile : (isReceived ? payment.payer_profile : payment.payee_profile);
                const PaymentMethodIcon = getPaymentMethodIcon(payment.payment_method);
                const StatusIcon = getStatusIcon(payment.payment_status);
                
                return (
                  <div key={payment.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={otherProfile?.profile_photo_url || ''} />
                            <AvatarFallback>
                              {otherProfile?.full_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full border">
                            {isReceived ? (
                              <ArrowDownLeft className="w-3 h-3 text-green-600" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-blue-600" />
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium text-sm">
                            {isTopUp ? 'Wallet Top-up' : (isReceived ? 'Received from' : 'Sent to')} {!isTopUp ? otherProfile?.full_name : ''}
                          </p>
                          {payment.job?.title && (
                            <p className="text-xs text-muted-foreground">
                              Job: {payment.job.title}
                            </p>
                          )}
                          {!payment.job?.title && isTopUp && (
                            <p className="text-xs text-muted-foreground">
                              Wallet Top-up
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <PaymentMethodIcon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground capitalize">
                              {payment.payment_method}
                            </span>
                            {payment.transaction_reference && (
                              <span className="text-xs text-muted-foreground">
                                • {payment.transaction_reference}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-semibold ${isTopUp ? 'text-green-600' : (isReceived ? 'text-green-600' : 'text-blue-600')}`}>
                          {isTopUp ? '+' : (isReceived ? '+' : '-')}{formatCurrency(payment.amount)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <StatusIcon className="w-3 h-3" />
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(payment.payment_status)}`}
                          >
                            {payment.payment_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
                        {payment.notes}
                      </p>
                    )}
                    
                    {payment.payment_status === 'pending' && isReceived && payment.payment_method === 'cash' && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          onClick={() => markPaymentAsCompleted(payment.id)}
                          className="w-full"
                        >
                          Confirm Receipt
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
