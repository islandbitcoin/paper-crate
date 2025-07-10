import { useState, useCallback, useEffect, useRef } from 'react';
import { nwc } from '@getalby/sdk';
import { useLocalStorage } from './useLocalStorage';
import { useToast } from './useToast';

export interface WalletInfo {
  alias: string;
  balance: number; // balance in sats
  pubkey: string;
  network: string;
  connected: boolean;
}

export interface PaymentRequest {
  amount: number; // sats
  description?: string;
  invoice: string; // bolt11 invoice
}

export interface PaymentResponse {
  preimage: string;
  feesPaid: number;
}

export function useNWC() {
  const [nwcString, setNwcString] = useLocalStorage<string>('nwc-connection', '');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Initialize NWC client
  const [nwcClient, setNwcClient] = useState<nwc.NWCClient | null>(null);

  const validateNWCString = (connectionString: string): boolean => {
    if (!connectionString.trim()) return false;
    if (!connectionString.startsWith('nostr+walletconnect://')) return false;

    try {
      // Basic URL validation
      new URL(connectionString);
      return true;
    } catch {
      return false;
    }
  };

  const connectWallet = useCallback(async (connectionString: string) => {
    // Prevent multiple connection attempts
    if (isConnecting || isConnected) {
      return false;
    }

    if (!validateNWCString(connectionString)) {
      toast({
        title: 'Invalid Connection String',
        description: 'Please enter a valid NWC connection string starting with nostr+walletconnect://',
        variant: 'destructive',
      });
      return false;
    }

    setIsConnecting(true);

    try {
      // Initialize NWC client with custom timeout
      const client = new nwc.NWCClient({
        nostrWalletConnectUrl: connectionString,
      });

      // Set a shorter timeout for initial connection test
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );

      // Get wallet info with timeout
      const info = await Promise.race([
        client.getInfo(),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof client.getInfo>>;
      
      // Try to get balance but don't fail if it times out
      let balance = { balance: 0 };
      try {
        const balanceTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Balance timeout')), 5000)
        );
        
        balance = await Promise.race([
          client.getBalance(),
          balanceTimeoutPromise
        ]) as Awaited<ReturnType<typeof client.getBalance>>;
      } catch (balanceError) {
        console.warn('Failed to fetch balance, continuing with connection:', balanceError);
        // Continue with connection even if balance fails
      }

      const walletData: WalletInfo = {
        alias: info.alias || 'Lightning Wallet',
        balance: Math.floor((balance.balance || 0) / 1000), // Convert millisats to sats
        pubkey: client.walletPubkey,
        network: 'mainnet', // Most NWC connections are mainnet
        connected: true,
      };

      setNwcClient(client);
      setWalletInfo(walletData);
      setIsConnected(true);
      setNwcString(connectionString);

      toast({
        title: 'Wallet Connected',
        description: `Successfully connected to ${walletData.alias}${balance.balance === 0 ? '. Balance will be fetched on next refresh.' : ''}`,
      });

      return true;
    } catch (error) {
      console.error('NWC connection error:', error);

      let errorMessage = 'Failed to connect to wallet. Please check your connection string.';

      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('reply timeout')) {
          errorMessage = 'Connection timeout. Your wallet may be offline or the connection string may have expired. Please check your wallet and try generating a new connection string.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please ensure your wallet allows this connection.';
        } else if (error.message.includes('rate-limited')) {
          errorMessage = 'Rate limited by relay. Please wait a moment and try again.';
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Invalid connection string. Please check the format and try again.';
        }
      }

      toast({
        title: 'Connection Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      // Clear the stored connection string if it's a timeout, permission, or reply timeout error
      if (error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('permission') ||
        error.message.includes('reply timeout')
      )) {
        setNwcString('');
      }

      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [toast, setNwcString, isConnecting, isConnected]);

  const disconnectWallet = useCallback(() => {
    if (nwcClient) {
      nwcClient.close();
    }
    setNwcClient(null);
    setWalletInfo(null);
    setIsConnected(false);
    setNwcString('');

    toast({
      title: 'Wallet Disconnected',
      description: 'Your Lightning wallet has been disconnected.',
    });
  }, [nwcClient, toast, setNwcString]);

  const sendPayment = useCallback(async (paymentRequest: PaymentRequest): Promise<PaymentResponse | null> => {
    if (!nwcClient || !isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const response = await nwcClient.payInvoice({
        invoice: paymentRequest.invoice,
      });

      // Update balance after payment
      if (walletInfo) {
        setWalletInfo({
          ...walletInfo,
          balance: walletInfo.balance - paymentRequest.amount,
        });
      }

      toast({
        title: 'Payment Sent',
        description: `Successfully sent ${paymentRequest.amount} sats`,
      });

      return {
        preimage: response.preimage,
        feesPaid: response.fees_paid,
      };
    } catch (error) {
      console.error('Payment error:', error);

      let errorMessage = 'Payment failed. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance for this payment.';
        } else if (error.message.includes('route')) {
          errorMessage = 'No route found to destination.';
        }
      }

      toast({
        title: 'Payment Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  }, [nwcClient, isConnected, walletInfo, toast]);

  const refreshBalance = useCallback(async () => {
    if (!nwcClient || !isConnected) return;

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Balance refresh timeout')), 5000)
      );
      
      const balance = await Promise.race([
        nwcClient.getBalance(),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof nwcClient.getBalance>>;
      
      if (walletInfo) {
        setWalletInfo({
          ...walletInfo,
          balance: Math.floor((balance.balance || 0) / 1000), // Convert millisats to sats
        });
        
        toast({
          title: 'Balance Updated',
          description: `Current balance: ${Math.floor((balance.balance || 0) / 1000)} sats`,
        });
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      toast({
        title: 'Balance Refresh Failed',
        description: 'Could not fetch current balance. Please try again.',
        variant: 'destructive',
      });
    }
  }, [nwcClient, isConnected, walletInfo, toast]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!nwcClient || !isConnected) return false;

    try {
      await nwcClient.getInfo();
      toast({
        title: 'Connection Test Successful',
        description: 'Your wallet connection is working properly.',
      });
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      toast({
        title: 'Connection Test Failed',
        description: 'Your wallet connection may have issues.',
        variant: 'destructive',
      });
      return false;
    }
  }, [nwcClient, isConnected, toast]);

  // Use refs to track initial values for auto-reconnect
  const initialNwcString = useRef(nwcString);
  const hasAttemptedReconnect = useRef(false);

  // Auto-reconnect on page load if we have a stored connection string
  useEffect(() => {
    // Only attempt once on initial mount
    if (!initialNwcString.current || hasAttemptedReconnect.current || isConnected) {
      return;
    }

    const timer = setTimeout(() => {
      hasAttemptedReconnect.current = true;
      connectWallet(initialNwcString.current).catch((error) => {
        // If auto-reconnect fails due to timeout, clear the stored string
        if (error?.message?.includes('timeout')) {
          console.log('Auto-reconnect timed out, clearing stored connection');
          setNwcString('');
        } else {
          console.log('Auto-reconnect failed, manual connection required');
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [connectWallet, isConnected, setNwcString]); // Include necessary dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (nwcClient) {
        nwcClient.close();
      }
    };
  }, [nwcClient]);

  return {
    // State
    walletInfo,
    isConnected,
    isConnecting,
    nwcString,

    // Actions
    connectWallet,
    disconnectWallet,
    sendPayment,
    refreshBalance,
    testConnection,
    validateNWCString,
  };
}