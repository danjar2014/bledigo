'use client';

import ReverseSearchPage from '@/components/ReverseSearchPage';
import RequireAuth from '@/components/RequireAuth';

export default function NouvelleRecherchePage() {
  return (
    <RequireAuth roles={['traveler']}>
      <ReverseSearchPage />
    </RequireAuth>
  );
}
