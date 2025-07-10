import React, { createContext, ReactNode } from 'react';
import { useNWC as useNWCHook, WalletInfo, PaymentRequest, PaymentResponse } from '@/hooks/useNWC';

interface NWCContextType {
  // State
  walletInfo: WalletInfo | null;
  isConnected: boolean;
  isConnecting: boolean;
  nwcString: string;

  // Actions
  connectWallet: (connectionString: string) => Promise<boolean>;
  disconnectWallet: () => void;
  sendPayment: (paymentRequest: PaymentRequest) => Promise<PaymentResponse | null>;
  refreshBalance: () => Promise<void>;
  testConnection: () => Promise<boolean>;
  validateNWCString: (connectionString: string) => boolean;
}

const NWCContext = createContext<NWCContextType | undefined>(undefined);

export function NWCProvider({ children }: { children: ReactNode }) {
  const nwc = useNWCHook();

  return (
    <NWCContext.Provider value={nwc}>
      {children}
    </NWCContext.Provider>
  );
}

export { NWCContext };