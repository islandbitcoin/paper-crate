import { useState } from 'react';
import { Send, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useNWC } from '@/hooks/useNWCContext';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';

interface PaymentStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export function BusinessPaymentFlow() {
  const { user } = useCurrentUser();
  const { isConnected: walletConnected, walletInfo } = useNWC();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [creatorPubkey, setCreatorPubkey] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [invoice, setInvoice] = useState('');
  const [paymentHash, setPaymentHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get creator info if pubkey is valid
  const creatorAuthor = useAuthor(creatorPubkey);
  const creatorMetadata = creatorAuthor.data?.metadata;

  const steps: PaymentStep[] = [
    {
      id: 'wallet',
      title: 'Connect Wallet',
      description: 'Connect your business Lightning wallet via NWC',
      completed: walletConnected,
    },
    {
      id: 'creator',
      title: 'Select Creator',
      description: 'Enter the creator\'s Nostr public key or npub',
      completed: !!creatorPubkey && !!creatorMetadata,
    },
    {
      id: 'amount',
      title: 'Set Payment',
      description: 'Enter payment amount and description',
      completed: !!amount && !!description,
    },
    {
      id: 'invoice',
      title: 'Get Invoice',
      description: 'Request Lightning invoice from creator',
      completed: !!invoice,
    },
    {
      id: 'pay',
      title: 'Send Payment',
      description: 'Complete the Lightning payment',
      completed: !!paymentHash,
    },
  ];

  const handleCreatorInput = (input: string) => {
    setCreatorPubkey('');

    if (!input.trim()) return;

    try {
      // Handle npub format
      if (input.startsWith('npub1')) {
        const decoded = nip19.decode(input);
        if (decoded.type === 'npub') {
          setCreatorPubkey(decoded.data);
          return;
        }
      }

      // Handle hex pubkey (64 characters)
      if (input.length === 64 && /^[a-fA-F0-9]+$/.test(input)) {
        setCreatorPubkey(input);
        return;
      }

      toast({
        title: 'Invalid Format',
        description: 'Please enter a valid npub or hex public key',
        variant: 'destructive',
      });
    } catch {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid Nostr public key',
        variant: 'destructive',
      });
    }
  };

  const generateMockInvoice = () => {
    // Generate a mock invoice for demonstration purposes
    const mockInvoice = `lnbc${amount}000n1p0example...`; // This is just for demo
    setInvoice(mockInvoice);
    toast({
      title: 'Invoice Generated',
      description: 'Mock invoice created for demonstration. In production, this would come from the creator\'s wallet.',
    });
  };

  const handlePayment = async () => {
    if (!invoice || !amount) return;

    setIsProcessing(true);

    try {
      // For demo purposes, we'll simulate a successful payment
      // In production, this would use the real invoice
      const mockPaymentResult = {
        preimage: 'mock_preimage_' + Date.now(),
        paymentHash: 'mock_hash_' + Date.now(),
      };

      setPaymentHash(mockPaymentResult.paymentHash);

      toast({
        title: 'Payment Successful!',
        description: `Sent ${amount} sats to ${creatorMetadata?.name || 'creator'}`,
      });

      // TODO: Implement actual payment processing

    } catch {
      toast({
        title: 'Payment Failed',
        description: 'Failed to send payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 px-8 text-center">
          <p className="text-muted-foreground">
            Please log in as a business to access payment features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Business Payment Flow</CardTitle>
          <CardDescription>
            Pay creators directly with Lightning via NWC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : index === currentStep
                    ? 'border-blue-500 text-blue-500'
                    : 'border-gray-300 text-gray-300'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold">{steps[currentStep].title}</h3>
            <p className="text-muted-foreground">{steps[currentStep].description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              {walletConnected ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Wallet connected! Balance: {walletInfo?.balance || 0} sats
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please connect your Lightning wallet in the Profile → Settings page first.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="creator">Creator Public Key or npub</Label>
                <Input
                  id="creator"
                  placeholder="npub1... or hex public key"
                  onChange={(e) => handleCreatorInput(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {creatorMetadata && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="h-8 w-8" />
                    <div>
                      <h4 className="font-medium">{creatorMetadata.name || 'Anonymous'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {creatorMetadata.about || 'No bio available'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
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
                <Label htmlFor="description">Payment Description</Label>
                <Textarea
                  id="description"
                  placeholder="Payment for content creation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {creatorMetadata && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <strong>Paying:</strong> {creatorMetadata.name || 'Anonymous Creator'}
                  </p>
                  <p className="text-sm">
                    <strong>Amount:</strong> {amount || '0'} sats
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  In a real implementation, this would request an invoice from the creator's Lightning wallet.
                  For demo purposes, we'll generate a mock invoice.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="invoice">Lightning Invoice</Label>
                <Textarea
                  id="invoice"
                  placeholder="Lightning invoice will appear here..."
                  value={invoice}
                  readOnly
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={generateMockInvoice} className="w-full">
                Generate Mock Invoice
              </Button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-2">
                <h4 className="font-medium">Payment Summary</h4>
                <p><strong>Recipient:</strong> {creatorMetadata?.name || 'Anonymous'}</p>
                <p><strong>Amount:</strong> {amount} sats</p>
                <p><strong>Description:</strong> {description}</p>
              </div>

              {paymentHash ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Payment successful! Hash: {paymentHash.slice(0, 16)}...
                  </AlertDescription>
                </Alert>
              ) : (
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || !walletConnected}
                  className="w-full"
                >
                  {isProcessing ? (
                    'Processing Payment...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Payment
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            <Button
              onClick={nextStep}
              disabled={currentStep === steps.length - 1 || !steps[currentStep].completed}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}