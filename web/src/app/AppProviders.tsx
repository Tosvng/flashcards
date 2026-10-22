import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '../application/auth/AuthProvider';
import { createQueryClient } from '../application/queryClient';
import { ServicesProvider, type Services } from '../application/ServicesContext';

export function AppProviders({ services, children }: { services: Services; children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <ServicesProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ServicesProvider>
  );
}
