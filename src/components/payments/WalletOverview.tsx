import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TopUpForm } from './TopUpForm';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Eye,
  EyeOff
} from 'lucide-react';

interface WalletData {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

interface WalletOverviewProps {
  className?: string;
}

export const WalletOverview = ({ className }: WalletOverviewProps) => {
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchWallet();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [profile]);

  const setupRealtimeSubscription = () => {
    if (!profile?.id) return () => {};
    
    console.log('Setting up wallet real-time subscription...');
    
    const channel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Wallet updated:', payload);
          if (payload.eventType === 'UPDATE') {
            setWallet(payload.new as WalletData);
          } else {
            fetchWallet();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('Payment updated, checking if it affects current user...');
          // Refresh wallet when any payment is updated
          const paymentData = payload.new as any;
          if (paymentData && (paymentData.payer_id === profile.id || paymentData.payee_id === profile.id)) {
            console.log('Payment affects current user, refreshing wallet...');
            setTimeout(() => {
              fetchWallet();
            }, 1000); // Slightly longer delay to ensure triggers have processed
          }
        }
      )
      .subscribe((status) => {
        console.log('Wallet subscription status:', status);
      });

    return () => {
      console.log('Cleaning up wallet subscription...');
      supabase.removeChannel(channel);
    };
  };

  const fetchWallet = async () => {
    if (!profile?.id) return;

    try {
      console.log('Fetching wallet for user:', profile.id);
      const { data, error } = await supabase
        .rpc('get_or_create_wallet', { profile_user_id: profile.id });

      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log('Wallet data updated:', data[0]);
        setWallet(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount).replace('₹', 'रु ');
  };

  const formatAmount = (amount: number) => {
    return showBalance ? formatCurrency(amount) : '****';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Wallet not found</h3>
          <p className="text-muted-foreground">
            Unable to load wallet information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5" />
            <CardTitle>Wallet Overview</CardTitle>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            {showBalance ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <CardDescription>
          Your earnings and payment history
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
          <p className="text-3xl font-bold text-primary">
            {formatAmount(wallet.balance)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-600">Total Earned</span>
            </div>
            <p className="text-xl font-semibold">
              {formatAmount(wallet.total_earned)}
            </p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-600">Total Spent</span>
            </div>
            <p className="text-xl font-semibold">
              {formatAmount(wallet.total_spent)}
            </p>
          </div>
        </div>

        {/* Top Up Button */}
        <div className="mt-6">
          <TopUpForm onTopUpComplete={fetchWallet} />
        </div>

        {/* Wallet Info */}
        <div className="text-center text-sm text-muted-foreground mt-4">
          <p>Wallet created: {new Date(wallet.created_at).toLocaleDateString()}</p>
          <p>Last updated: {new Date(wallet.updated_at).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};
