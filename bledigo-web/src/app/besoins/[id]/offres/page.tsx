'use client';

import { useParams } from 'next/navigation';
import ReverseSearchPage from '@/components/ReverseSearchPage';
import RequireAuth from '@/components/RequireAuth';

export default function OffresPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <RequireAuth>
      <ReverseSearchPage reverseSearchId={id} />
    </RequireAuth>
  );
}
