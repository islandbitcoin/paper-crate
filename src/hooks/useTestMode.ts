import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TestModeStore {
  isTestMode: boolean;
  toggleTestMode: () => void;
  simulatedPayments: Array<{
    reportId: string;
    amount: number;
    timestamp: number;
    preimage: string;
  }>;
  addSimulatedPayment: (payment: { reportId: string; amount: number }) => void;
  clearSimulatedPayments: () => void;
}

export const useTestMode = create<TestModeStore>()(
  persist(
    (set) => ({
      isTestMode: false,
      simulatedPayments: [],
      
      toggleTestMode: () => set((state) => ({ 
        isTestMode: !state.isTestMode 
      })),
      
      addSimulatedPayment: (payment) => set((state) => ({
        simulatedPayments: [...state.simulatedPayments, {
          ...payment,
          timestamp: Date.now(),
          preimage: `test_${payment.reportId}_${Date.now()}`,
        }]
      })),
      
      clearSimulatedPayments: () => set({ simulatedPayments: [] }),
    }),
    {
      name: 'paper-crate-test-mode',
    }
  )
);