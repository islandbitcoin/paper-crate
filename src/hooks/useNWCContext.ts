import { useContext } from 'react';
import { NWCContext } from '@/contexts/NWCContext';

export function useNWC() {
  const context = useContext(NWCContext);
  if (!context) {
    throw new Error('useNWC must be used within an NWCProvider');
  }
  return context;
}