'use client';

import OwnerCreditsPage from '@/components/OwnerCreditsPage';
import RequireAuth from '@/components/RequireAuth';

export default function CreditsPage() {
  return (
    <RequireAuth roles={['owner', 'agency']}>
      <OwnerCreditsPage />
    </RequireAuth>
  );
}
