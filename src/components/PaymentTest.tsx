import { useState } from 'react';
import { Zap, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNWC } from '@/hooks/useNWCContext';
import { useToast } from '@/hooks/useToast';

export function PaymentTest() {
  const { isConnected, sendPayment } = useNWC();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [invoice, setInvoice] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendPayment = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount in sats.',
        variant: 'destructive',
      });
      return;
    }

    if (!invoice.trim()) {
      toast({
        title: 'Missing Invoice',
        description: 'Please enter a Lightning invoice to pay.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const result = await sendPayment({
        amount: Number(amount),
        description: description || 'Test payment',
        invoice: invoice,
      });

      if (result) {
        setAmount('');
        setDescription('');
        setInvoice('');

        toast({
          title: 'Payment Successful',
          description: `Sent ${amount} sats successfully!`,
        });
      }
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Payment Test</span>
          </CardTitle>
          <CardDescription>
            Test Lightning payments with your connected wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please connect your Lightning wallet first to test payments.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Payment Test</span>
        </CardTitle>
        <CardDescription>
          Test Lightning payments with your connected wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-sm">
            ⚠️ This will send real sats from your wallet. Only use small amounts for testing.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="invoice">Lightning Invoice</Label>
            <Textarea
              id="invoice"
              placeholder="lnbc1..."
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              className="font-mono text-sm"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste a Lightning invoice (bolt11) to pay
            </p>
          </div>

          <div>
            <Label htmlFor="amount">Amount (sats)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Test payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSendPayment}
            disabled={isSending || !amount || !invoice}
            className="w-full"
          >
            {isSending ? (
              'Sending...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Payment
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}