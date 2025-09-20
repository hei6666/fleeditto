'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './WalletProvider';
import { AppProvider } from '../contexts/AppContext';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <AppProvider>
          {children}
        </AppProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}