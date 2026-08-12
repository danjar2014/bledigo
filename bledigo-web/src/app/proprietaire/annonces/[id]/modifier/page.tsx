'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Pencil, CalendarDays } from 'lucide-react';
import { api } from '@/lib/api';
import ListingEdit from '@/components/ListingEdit';
import OwnerCalendar from '@/components/OwnerCalendar';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorBox } from '@/components/ui';

/**
 * Deux volets pour une meme annonce : ce qu elle est, et quand elle est
 * disponible. Le calendrier vit ici plutot que sur un ecran separe — c est la
 * meme decision editoriale, prise au meme endroit.
 */
export default function ModifierAnnoncePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [onglet, setOnglet] = useState<'annonce' | 'calendrier'>('annonce');

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.listing(id),
  });

  const onglets = [
    ['annonce', 'Annonce', Pencil],
    ['calendrier', 'Calendrier et tarifs', CalendarDays],
  ] as const;

  return (
    <RequireAuth roles={['owner', 'agency']}>
      <main className="min-h-screen bg-cream py-8">
        <div className="container mx-auto px-4">
          {isLoading && <Spinner />}
          {error && <ErrorBox error={error} />}

          {listing && (
            <>
              <h1 className="text-2xl font-display font-bold text-charcoal mb-1">
                {listing.title}
              </h1>
              <p className="text-slate mb-5">{listing.city}</p>

              <div className="flex gap-2 mb-6">
                {onglets.map(([cle, libelle, Icone]) => (
                  <button
                    key={cle}
                    onClick={() => setOnglet(cle)}
                    className={`px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-all ${
                      onglet === cle ? 'bg-bledi-blue text-white' : 'bg-white text-slate hover:bg-cloud'
                    }`}
                  >
                    <Icone className="w-4 h-4" />
                    {libelle}
                  </button>
                ))}
              </div>

              {onglet === 'annonce' ? (
                <ListingEdit listing={listing} onCancel={() => router.push('/proprietaire')} />
              ) : (
                <OwnerCalendar listingId={listing.id} />
              )}
            </>
          )}
        </div>
      </main>
    </RequireAuth>
  );
}
