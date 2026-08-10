'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ListingEdit from '@/components/ListingEdit';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorBox } from '@/components/ui';

export default function ModifierAnnoncePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.listing(id),
  });

  return (
    <RequireAuth roles={['owner', 'agency']}>
      <main className="min-h-screen bg-cream py-8">
        <div className="container mx-auto px-4">
          {isLoading && <Spinner />}
          {error && <ErrorBox error={error} />}
          {listing && (
            <ListingEdit listing={listing} onCancel={() => router.push('/proprietaire')} />
          )}
        </div>
      </main>
    </RequireAuth>
  );
}
