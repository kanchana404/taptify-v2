import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentForm({ clientSecret, amount, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        setErrorMessage(error.message ?? 'An error occurred during payment');
      } else {
        onSuccess();
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-lg font-semibold mb-4">
        Total: ${amount.toFixed(2)}
      </div>
      
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Button>
      </div>
    </form>
  );
} 