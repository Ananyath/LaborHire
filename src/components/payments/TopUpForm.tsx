
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Smartphone, Building, Banknote, CreditCard } from 'lucide-react';

interface TopUpFormProps {
  onTopUpComplete?: () => void;
}

const paymentMethods = [
  { value: 'esewa', label: 'eSewa', icon: Smartphone },
  { value: 'khalti', label: 'Khalti', icon: Smartphone },
  { value: 'bank', label: 'Bank Transfer', icon: Building },
  { value: 'cash', label: 'Cash', icon: Banknote },
];

export const TopUpForm = ({ onTopUpComplete }: TopUpFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Payment methods that require transaction reference
  const requiresTransactionRef = ['esewa', 'khalti', 'bank'];
  const isTransactionRefRequired = requiresTransactionRef.includes(paymentMethod);

  const handleTopUp = async () => {
    if (!profile?.id || !amount || !paymentMethod) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Validate transaction reference for required payment methods
    if (isTransactionRefRequired && !transactionRef.trim()) {
      toast({
        title: 'Transaction Reference Required',
        description: `Please enter a transaction reference for ${paymentMethod} payment.`,
        variant: 'destructive',
      });
      return;
    }

    const topUpAmount = parseFloat(amount);
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    if (topUpAmount > 1000000) {
      toast({
        title: 'Error',
        description: 'Top-up amount cannot exceed रु 10,00,000.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create a top-up payment record (payer and payee are the same for top-ups)
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          payer_id: profile.id,
          payee_id: profile.id, // Same as payer for top-ups
          amount: topUpAmount,
          payment_method: paymentMethod as any,
          payment_status: 'completed', // Top-ups are automatically completed
          transaction_reference: transactionRef || null,
          notes: notes || `Wallet top-up via ${paymentMethod}`,
          payment_details: {
            type: 'top_up',
            method: paymentMethod
          }
        });

      if (paymentError) throw paymentError;

      // The wallet balance will be automatically updated by the payment trigger
      // Just wait a moment for the trigger to process
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: 'Top-up Successful',
        description: `रु ${topUpAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been added to your wallet.`,
      });

      // Reset form
      setAmount('');
      setPaymentMethod('');
      setTransactionRef('');
      setNotes('');
      setOpen(false);

      // Notify parent component
      onTopUpComplete?.();

    } catch (error: any) {
      console.error('Error processing top-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to process top-up. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodInstructions = () => {
    switch (paymentMethod) {
      case 'esewa':
        return 'Please complete the payment through eSewa app and enter the transaction ID below.';
      case 'khalti':
        return 'Please complete the payment through Khalti app and enter the transaction ID below.';
      case 'bank':
        return 'Please transfer the amount to the specified bank account and enter the reference number.';
      case 'cash':
        return 'Please visit our office to complete the cash top-up.';
      default:
        return 'Select a payment method to see instructions.';
    }
  };

  const isFormValid = () => {
    const hasAmount = amount && parseFloat(amount) > 0;
    const hasPaymentMethod = paymentMethod;
    const hasRequiredTransactionRef = !isTransactionRefRequired || transactionRef.trim();
    
    return hasAmount && hasPaymentMethod && hasRequiredTransactionRef;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Top Up Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>
            Add money to your wallet balance for easy payments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (रु) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max="1000000"
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4" />
                        <span>{method.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                {getPaymentMethodInstructions()}
              </p>
            </div>
          )}

          {paymentMethod && requiresTransactionRef.includes(paymentMethod) && (
            <div>
              <Label htmlFor="transactionRef">
                Transaction Reference *
                <span className="text-xs text-muted-foreground ml-1">
                  (Required for {paymentMethod})
                </span>
              </Label>
              <Input
                id="transactionRef"
                placeholder="Enter transaction ID/reference"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className={!transactionRef.trim() && isTransactionRefRequired ? 'border-red-300' : ''}
              />
              {!transactionRef.trim() && isTransactionRefRequired && (
                <p className="text-xs text-red-600 mt-1">
                  Transaction reference is required for {paymentMethod} payments
                </p>
              )}
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> For cash payments, no transaction reference is required. 
                Please visit our office to complete the payment.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={loading || !isFormValid()}
              className="flex-1"
            >
              {loading ? 'Processing...' : `Top Up रु ${amount || '0'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
