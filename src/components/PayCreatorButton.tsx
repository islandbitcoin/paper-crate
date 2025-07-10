import { useState } from 'react';
import { Zap, Loader2, Wallet, TestTube, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

import { useNWC } from '@/hooks/useNWC';
import { useWebLN } from '@/hooks/useWebLN';
import { useTestMode } from '@/hooks/useTestMode';
import { useToast } from '@/hooks/useToast';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCampaignStore } from '@/stores/campaignStore';
import { formatSats } from '@/lib/campaign-utils';
import { 
  validateLightningAddress, 
  validateLightningInvoice,
  buildLightningAddressUrl 
} from '@/lib/security/lightning-validation';
import { logPaymentAttempt, logPaymentFailure } from '@/lib/security/monitoring';
import { SECURITY_CONFIG } from '@/lib/security/config';
import type { PerformanceReport } from '@/stores/campaignStore';

interface PayCreatorButtonProps {
  report: PerformanceReport;
  campaignId: string;
}

export function PayCreatorButton({ report, campaignId }: PayCreatorButtonProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoice, setInvoice] = useState('');
  const [paymentHash, setPaymentHash] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'webln' | 'nwc'>('webln');
  
  const { isConnected: nwcConnected, sendPayment: sendNWCPayment } = useNWC();
  const { isAvailable: webLNAvailable, sendPayment: sendWebLNPayment } = useWebLN();
  const { isTestMode, addSimulatedPayment } = useTestMode();
  const { toast } = useToast();
  const { mutate: publishEvent } = useNostrPublish();
  const { user } = useCurrentUser();
  const updateCampaignSpent = useCampaignStore(state => state.updateCampaignSpent);
  
  // Get creator's Lightning address
  const creatorAuthor = useAuthor(report.creatorPubkey);
  const lightningAddress = creatorAuthor.data?.metadata?.lud16 || creatorAuthor.data?.metadata?.lud06;

  // Check if already paid
  if (report.paymentHash) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Zap className="h-4 w-4 mr-2" />
        Paid
      </Button>
    );
  }

  const handleRequestInvoice = async () => {
    if (!lightningAddress) {
      toast({
        title: 'No Lightning Address',
        description: 'This creator has not set up a Lightning address.',
        variant: 'destructive',
      });
      return;
    }

    // Validate Lightning address first
    const addressValidation = validateLightningAddress(lightningAddress);
    if (!addressValidation.valid) {
      toast({
        title: 'Invalid Lightning Address',
        description: addressValidation.error || 'The Lightning address format is invalid.',
        variant: 'destructive',
      });
      logPaymentFailure(user?.pubkey || '', report.amountClaimed, 'Invalid Lightning address');
      return;
    }

    setIsProcessing(true);
    
    try {
      let invoiceUrl: string | null = null;
      
      if (lightningAddress.includes('@') && addressValidation.username && addressValidation.domain) {
        // lud16 format: username@domain
        invoiceUrl = buildLightningAddressUrl(addressValidation.username, addressValidation.domain);
        if (!invoiceUrl) {
          throw new Error('Failed to build Lightning address URL');
        }
      } else if (lightningAddress.startsWith('https://')) {
        // lud06 format: already a URL
        invoiceUrl = lightningAddress;
      }
      
      if (!invoiceUrl) {
        throw new Error('Invalid Lightning address format');
      }
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const lnurlResponse = await fetch(invoiceUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      clearTimeout(timeout);
      
      if (!lnurlResponse.ok) {
        throw new Error(`HTTP ${lnurlResponse.status}: ${lnurlResponse.statusText}`);
      }
      
      const lnurlData = await lnurlResponse.json();
      
      // Validate response has required fields
      if (!lnurlData.callback) {
        throw new Error('Invalid LNURL response: missing callback');
      }
      
      // Validate callback URL
      const callbackValidation = new URL(lnurlData.callback);
      if (!['http:', 'https:'].includes(callbackValidation.protocol)) {
        throw new Error('Invalid callback protocol');
      }
      
      // Request invoice with amount in millisats
      const invoiceController = new AbortController();
      const invoiceTimeout = setTimeout(() => invoiceController.abort(), 10000);
      
      const invoiceResponse = await fetch(
        `${lnurlData.callback}?amount=${report.amountClaimed * 1000}`,
        {
          signal: invoiceController.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      clearTimeout(invoiceTimeout);
      
      if (!invoiceResponse.ok) {
        throw new Error(`Invoice request failed: HTTP ${invoiceResponse.status}`);
      }
      
      const invoiceData = await invoiceResponse.json();
      
      if (!invoiceData.pr) {
        throw new Error('No invoice returned');
      }
      
      // Validate the invoice before accepting it
      const validation = validateLightningInvoice(
        invoiceData.pr,
        report.amountClaimed,
        user?.pubkey
      );
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid invoice');
      }
      
      setInvoice(invoiceData.pr);
      
    } catch (error) {
      console.error('Failed to request invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: 'Invoice Request Failed',
        description: `Could not get invoice: ${errorMessage}`,
        variant: 'destructive',
      });
      
      logPaymentFailure(user?.pubkey || '', report.amountClaimed, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice && !isTestMode) return;

    // Log payment attempt
    logPaymentAttempt(
      user?.pubkey || '',
      report.amountClaimed,
      campaignId
    );

    // Check if amount requires extra confirmation
    if (report.amountClaimed > SECURITY_CONFIG.payment.confirmationThreshold && !isTestMode) {
      const confirmed = window.confirm(
        `This payment of ${formatSats(report.amountClaimed)} exceeds the confirmation threshold. Are you sure you want to proceed?`
      );
      if (!confirmed) {
        logPaymentFailure(user?.pubkey || '', report.amountClaimed, 'User cancelled high-value payment');
        return;
      }
    }

    setIsProcessing(true);

    try {
      let result: { preimage: string } | null = null;
      
      // Test mode simulation
      if (isTestMode) {
        // Simulate payment delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const testPreimage = `test_${report.id}_${Date.now()}`;
        result = { preimage: testPreimage };
        
        // Add to simulated payments
        addSimulatedPayment({
          reportId: report.id,
          amount: report.amountClaimed,
        });
        
        toast({
          title: 'Test Payment Simulated',
          description: `Test payment of ${formatSats(report.amountClaimed)} completed`,
        });
      } else {
        // Real payment methods
        if (paymentMethod === 'webln') {
          result = await sendWebLNPayment(invoice);
        } else {
          // NWC payment
          if (!nwcConnected) {
            toast({
              title: 'Wallet Not Connected',
              description: 'Please connect your NWC wallet in Profile → Settings first.',
              variant: 'destructive',
            });
            return;
          }
          result = await sendNWCPayment({
            invoice,
            amount: report.amountClaimed,
            description: `Payment for ${report.platform} post`
          });
        }
      }
      
      if (result && result.preimage) {
        setPaymentHash(result.preimage);
        
        // Update campaign spent amount
        updateCampaignSpent(campaignId, report.amountClaimed);
        
        // Publish payment confirmation event
        publishEvent({
          kind: 34611, // Payment confirmation event
          content: JSON.stringify({
            reportId: report.id,
            campaignCoordinate: report.campaignCoordinate,
            amount: report.amountClaimed,
            paymentHash: result.preimage,
            timestamp: Math.floor(Date.now() / 1000),
          }),
          tags: [
            ['d', `payment-${report.id}`],
            ['p', report.creatorPubkey],
            ['e', report.id],
            ['a', report.campaignCoordinate],
            ['amount', report.amountClaimed.toString()],
            ['preimage', result.preimage],
          ],
        });

        toast({
          title: 'Payment Successful!',
          description: `Sent ${formatSats(report.amountClaimed)} to creator`,
        });

        // Close dialog after successful payment
        setTimeout(() => {
          setOpen(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        title: 'Payment Failed',
        description: 'Failed to send payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <Zap className="h-4 w-4 mr-2" />
        Pay Creator
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Creator</DialogTitle>
            <DialogDescription>
              Send {formatSats(report.amountClaimed)} to {creatorAuthor.data?.metadata?.name || 'creator'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Creator Info with Security Status */}
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-sm">
                  <strong>Creator:</strong> {creatorAuthor.data?.metadata?.name || 'Anonymous'}
                </p>
                <p className="text-sm">
                  <strong>Amount:</strong> {formatSats(report.amountClaimed)}
                </p>
                <p className="text-sm">
                  <strong>Platform:</strong> {report.platform}
                </p>
                {lightningAddress && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <strong>Lightning:</strong> {lightningAddress}
                    </p>
                    {(() => {
                      const validation = validateLightningAddress(lightningAddress);
                      return validation.valid ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      );
                    })()}
                  </div>
                )}
              </div>
              
              {report.amountClaimed > SECURITY_CONFIG.payment.confirmationThreshold && (
                <Alert className="border-orange-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    High-value payment ({formatSats(report.amountClaimed)}): Additional confirmation required
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Test Mode Notice */}
            {isTestMode && (
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                <TestTube className="h-4 w-4" />
                <AlertDescription>
                  Test mode is enabled. Payments will be simulated without real Lightning transactions.
                </AlertDescription>
              </Alert>
            )}

            {/* Invoice Section */}
            {!invoice && !isTestMode ? (
              <div className="space-y-3">
                {lightningAddress ? (
                  <Button
                    onClick={handleRequestInvoice}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Requesting Invoice...
                      </>
                    ) : (
                      'Request Invoice'
                    )}
                  </Button>
                ) : (
                  <Alert>
                    <AlertDescription>
                      This creator has not set up a Lightning address. They need to add one to their Nostr profile.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : isTestMode ? (
              <div className="space-y-3">
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Simulating Payment...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Simulate Test Payment
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="invoice">Lightning Invoice</Label>
                  <Input
                    id="invoice"
                    value={invoice}
                    readOnly
                    className="font-mono text-xs"
                  />
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(value: 'webln' | 'nwc') => setPaymentMethod(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="webln" id="webln" />
                      <Label htmlFor="webln" className="flex items-center cursor-pointer">
                        <Wallet className="h-4 w-4 mr-2" />
                        WebLN (Browser Extension)
                        {webLNAvailable && <Badge variant="secondary" className="ml-2 text-xs">Available</Badge>}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nwc" id="nwc" />
                      <Label htmlFor="nwc" className="flex items-center cursor-pointer">
                        <Zap className="h-4 w-4 mr-2" />
                        NWC (Nostr Wallet Connect)
                        {nwcConnected && <Badge variant="secondary" className="ml-2 text-xs">Connected</Badge>}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {paymentHash ? (
                  <Alert>
                    <AlertDescription>
                      Payment successful! Payment hash: {paymentHash.slice(0, 16)}...
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending Payment...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Send Payment
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}