import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Building, 
  Banknote,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PaymentFormProps {
  payeeId: string;
  payeeName: string;
  jobId?: string;
  jobTitle?: string;
  defaultAmount?: number;
  payRate?: string;
  onPaymentCreated?: () => void;
  children?: React.ReactNode;
}

type PaymentMethod = 'esewa' | 'khalti' | 'bank' | 'cash';

const paymentMethods = [
  { value: 'esewa', label: 'eSewa', icon: Smartphone },
  { value: 'khalti', label: 'Khalti', icon: Smartphone },
  { value: 'bank', label: 'Bank Transfer', icon: Building },
  { value: 'cash', label: 'Cash', icon: Banknote }
];

// Payment methods that require transaction reference
const requiresTransactionRef = ['esewa', 'khalti', 'bank'];

export const PaymentForm = ({ 
  payeeId, 
  payeeName, 
  jobId, 
  jobTitle, 
  defaultAmount,
  payRate,
  onPaymentCreated,
  children 
}: PaymentFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [existingPayment, setExistingPayment] = useState<any>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  const [formData, setFormData] = useState(() => {
    let initialAmount = '';
    if (payRate) {
      // Extract numeric value from payRate string (e.g., "Rs. 500/hour" -> 500)
      const numericValue = payRate.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '';
      initialAmount = numericValue;
    } else if (defaultAmount) {
      initialAmount = defaultAmount.toString();
    }
    
    return {
      amount: initialAmount,
      payment_method: undefined as PaymentMethod | undefined,
      notes: '',
      transaction_reference: ''
    };
  });

  // Check if payment already exists for this job-worker combination
  const checkExistingPayment = async () => {
    if (!profile?.id || !jobId || !payeeId) return;

    setCheckingPayment(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('job_id', jobId)
        .eq('payer_id', profile.id)
        .eq('payee_id', payeeId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      setExistingPayment(data);
    } catch (error) {
      console.error('Error checking existing payment:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  // Fetch wallet balance when component mounts
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!profile?.id) return;

      try {
        const { data, error } = await supabase.rpc('get_or_create_wallet', {
          profile_user_id: profile.id
        });

        if (error) throw error;
        if (data && data.length > 0) {
          setWalletBalance(data[0].balance || 0);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    };

    fetchWalletBalance();
  }, [profile?.id]);

  // Check for existing payment when dialog opens
  useEffect(() => {
    if (isOpen && jobId) {
      checkExistingPayment();
    }
  }, [isOpen, jobId, profile?.id, payeeId]);

  const isTransactionRefRequired = (method: PaymentMethod | undefined) => {
    return method && requiresTransactionRef.includes(method);
  };

  const isFormValid = () => {
    const hasAmount = formData.amount && parseFloat(formData.amount) > 0;
    const hasPaymentMethod = formData.payment_method;
    const hasRequiredTransactionRef = !isTransactionRefRequired(formData.payment_method) || 
                                     formData.transaction_reference.trim() !== '';
    
    return hasAmount && hasPaymentMethod && hasRequiredTransactionRef;
  };

  const handleSubmitPayment = async () => {
    if (!profile?.id || !formData.amount || !formData.payment_method) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Validate transaction reference for required payment methods
    if (isTransactionRefRequired(formData.payment_method) && !formData.transaction_reference.trim()) {
      toast({
        title: 'Transaction Reference Required',
        description: `Please enter a transaction reference for ${formData.payment_method} payment.`,
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    // Validate payment amount matches job pay rate exactly
    if (payRate) {
      const expectedAmount = parseFloat(payRate.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
      if (amount !== expectedAmount) {
        toast({
          title: 'Error',
          description: `Payment amount must be exactly रु ${expectedAmount.toLocaleString('en-IN')} as per the job pay rate.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Check if user has sufficient balance
    if (amount > walletBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need रु ${amount.toLocaleString('en-IN')} but your current balance is रु ${walletBalance.toLocaleString('en-IN')}.`,
        variant: 'destructive',
      });
      return;
    }

    // Double-check for existing payment before submitting
    if (jobId) {
      await checkExistingPayment();
      if (existingPayment) {
        toast({
          title: 'Payment Already Exists',
          description: `You have already made a payment for this job. Payment ID: ${existingPayment.id.slice(0, 8)}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      const paymentData = {
        payer_id: profile.id,
        payee_id: payeeId,
        job_id: jobId || null,
        amount,
        payment_method: formData.payment_method,
        transaction_reference: formData.transaction_reference || null,
        notes: formData.notes || null,
        payment_details: {
          job_title: jobTitle,
          payee_name: payeeName,
          created_by: profile.full_name
        }
      };

      const { error } = await supabase
        .from('payments')
        .insert({
          ...paymentData,
          payment_status: 'completed' // Automatically complete the payment
        });

      if (error) {
        // Handle unique constraint violation using error code and message
        if (error.code === '23505' && error.message?.includes('unique_job_worker_payment')) {
          toast({
            title: 'Payment Already Exists',
            description: 'You have already made a payment for this job.',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Payment Created',
        description: `Payment of रु ${amount} has been initiated to ${payeeName}.`,
      });

      // Reset form
      setFormData({
        amount: '',
        payment_method: undefined,
        notes: '',
        transaction_reference: ''
      });
      setIsOpen(false);
      
      if (onPaymentCreated) {
        onPaymentCreated();
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentMethodInstructions = (method: PaymentMethod) => {
    switch (method) {
      case 'esewa':
        return 'Please provide your eSewa transaction ID after completing the payment.';
      case 'khalti':
        return 'Please provide your Khalti transaction ID after completing the payment.';
      case 'bank':
        return 'Please provide the bank transfer reference number.';
      case 'cash':
        return 'Cash payment will be marked as pending until confirmed by both parties.';
      default:
        return '';
    }
  };

  // Show existing payment status if payment already exists
  if (existingPayment && jobId) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button variant="outline" disabled>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Payment Completed
            </Button>
          )}
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Payment Already Made</span>
            </DialogTitle>
            <DialogDescription>
              You have already paid {payeeName} for "{jobTitle}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="space-y-2">
                <p><strong>Amount:</strong> रु {existingPayment.amount.toLocaleString('en-IN')}</p>
                <p><strong>Payment Method:</strong> {existingPayment.payment_method}</p>
                <p><strong>Status:</strong> {existingPayment.payment_status}</p>
                <p><strong>Date:</strong> {new Date(existingPayment.created_at).toLocaleDateString()}</p>
                {existingPayment.transaction_reference && (
                  <p><strong>Reference:</strong> {existingPayment.transaction_reference}</p>
                )}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={checkingPayment}>
            <DollarSign className="w-4 h-4 mr-2" />
            {checkingPayment ? 'Checking...' : 'Make Payment'}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Send payment to {payeeName}
            {jobTitle && ` for "${jobTitle}"`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Amount */}
          <div>
            <Label htmlFor="amount">Amount (रु) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              disabled={!!payRate}
              readOnly={!!payRate}
            />
            {payRate && (
              <p className="text-xs text-muted-foreground mt-1">
                Amount is fixed based on job pay rate: {payRate}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Current wallet balance: रु {walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <Label htmlFor="payment_method">Payment Method *</Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value: PaymentMethod) => 
                setFormData(prev => ({ ...prev, payment_method: value, transaction_reference: '' }))
              }
            >
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
            
            {formData.payment_method && (
              <p className="text-xs text-muted-foreground mt-1">
                {getPaymentMethodInstructions(formData.payment_method)}
              </p>
            )}
          </div>

          {/* Transaction Reference */}
          {formData.payment_method && (
            <div>
              <Label htmlFor="transaction_reference">
                Transaction Reference
                {isTransactionRefRequired(formData.payment_method) && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <Input
                id="transaction_reference"
                placeholder={
                  formData.payment_method === 'esewa' ? 'eSewa Transaction ID' :
                  formData.payment_method === 'khalti' ? 'Khalti Transaction ID' :
                  formData.payment_method === 'bank' ? 'Bank Transfer Reference' :
                  'Optional reference'
                }
                value={formData.transaction_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_reference: e.target.value }))}
                className={
                  isTransactionRefRequired(formData.payment_method) && !formData.transaction_reference.trim()
                    ? 'border-red-300 focus:border-red-500'
                    : ''
                }
              />
              {isTransactionRefRequired(formData.payment_method) && !formData.transaction_reference.trim() && (
                <p className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Transaction reference is required for {formData.payment_method} payments</span>
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this payment..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={!isFormValid() || submitting}
            >
              {submitting ? 'Creating...' : `Pay रु ${formData.amount || '0.00'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
