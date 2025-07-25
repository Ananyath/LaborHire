import { WalletOverview } from '@/components/payments/WalletOverview';
import { TransactionHistory } from '@/components/payments/TransactionHistory';

const WalletPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Wallet & Payments</h1>
        <p className="text-muted-foreground">Manage your earnings and payment transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Wallet Overview */}
        <div className="lg:col-span-1">
          <WalletOverview />
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <TransactionHistory />
        </div>
      </div>
    </div>
  );
};

export default WalletPage;