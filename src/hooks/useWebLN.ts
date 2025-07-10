import { useState, useEffect, useCallback } from 'react';
import { useToast } from './useToast';

// WebLN type definitions
interface WebLNProvider {
  enable: () => Promise<void>;
  sendPayment: (paymentRequest: string) => Promise<SendPaymentResponse>;
  makeInvoice: (args: { amount?: number | string; defaultMemo?: string }) => Promise<MakeInvoiceResponse>;
  signMessage: (message: string) => Promise<SignMessageResponse>;
  verifyMessage: (signature: string, message: string) => Promise<void>;
  getInfo: () => Promise<GetInfoResponse>;
}

interface SendPaymentResponse {
  preimage: string;
  paymentRequest?: string;
  route?: unknown;
}

interface MakeInvoiceResponse {
  paymentRequest: string;
  rHash: string;
}

interface SignMessageResponse {
  message: string;
  signature: string;
}

interface GetInfoResponse {
  node?: {
    alias: string;
    pubkey: string;
    color?: string;
  };
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

export function useWebLN() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [provider, setProvider] = useState<WebLNProvider | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.webln) {
      setIsAvailable(true);
      setProvider(window.webln);
    }
  }, []);

  const enable = useCallback(async () => {
    if (!provider) {
      toast({
        title: 'WebLN Not Available',
        description: 'Please install a WebLN-enabled wallet like Alby to make payments.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await provider.enable();
      setIsEnabled(true);
      return true;
    } catch (error) {
      console.error('Failed to enable WebLN:', error);
      toast({
        title: 'WebLN Connection Failed',
        description: 'Failed to connect to your Lightning wallet. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [provider, toast]);

  const sendPayment = useCallback(async (invoice: string): Promise<SendPaymentResponse | null> => {
    if (!provider || !isEnabled) {
      const enabled = await enable();
      if (!enabled) return null;
    }

    try {
      const response = await provider!.sendPayment(invoice);
      toast({
        title: 'Payment Successful',
        description: 'Your Lightning payment has been sent.',
      });
      return response;
    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Failed to send payment.',
        variant: 'destructive',
      });
      return null;
    }
  }, [provider, isEnabled, enable, toast]);

  const makeInvoice = useCallback(async (amount: number, memo?: string): Promise<MakeInvoiceResponse | null> => {
    if (!provider || !isEnabled) {
      const enabled = await enable();
      if (!enabled) return null;
    }

    try {
      const response = await provider!.makeInvoice({
        amount: amount.toString(),
        defaultMemo: memo,
      });
      return response;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast({
        title: 'Invoice Creation Failed',
        description: 'Failed to create Lightning invoice.',
        variant: 'destructive',
      });
      return null;
    }
  }, [provider, isEnabled, enable, toast]);

  return {
    isAvailable,
    isEnabled,
    enable,
    sendPayment,
    makeInvoice,
    provider,
  };
}