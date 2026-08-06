'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
