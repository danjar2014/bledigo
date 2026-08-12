'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import ListingCard from '@/components/ListingCard';
import { api } from '@/lib/api';
import { Spinner, ErrorBox, Empty } from '@/components/ui';

const VILLES = ['Hammamet', 'Djerba', 'La Marsa', 'Sidi Bou Said', 'Tunis', 'Sousse'];
const TYPES = ['apartment', 'villa', 'house', 'studio', 'riad', 'bungalow', 'penthouse', 'chalet'];

function Resultats() {
  const params = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState({
    q: params.get('q') || '',
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    guests: params.get('guests') || '',
    minPrice: '',
    maxPrice: '',
  });

  // Les dates commandent la disponibilite : sans elles, la liste afficherait
  // des logements que l hote a fermes ou qui sont deja reserves.
  const datesChoisies = filters.checkIn !== '' && filters.checkOut !== '';

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => api.search(filters),
    enabled: datesChoisies,
  });

  const apply = (next: Partial<typeof filters>) => {
    const merged = { ...filters, ...next };
    setFilters(merged);
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v) as [string, string][],
    );
    router.replace(`/recherche?${qs.toString()}`);
  };

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6">
          {filters.q ? `Logements a ${filters.q}` : 'Rechercher un logement'}
        </h1>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Filtres */}
          <aside className="bg-white rounded-bledi p-5 shadow-bledi h-fit">
            <div className="flex items-center gap-2 font-display font-semibold text-charcoal mb-4">
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
            </div>

            <label className="block text-sm font-medium mb-1">Destination</label>
            <input
              className="input-bledi mb-4"
              list="villes"
              value={filters.q}
              onChange={(e) => apply({ q: e.target.value })}
              placeholder="Toutes les villes"
            />
            <datalist id="villes">
              {VILLES.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>

            <label className="block text-sm font-medium mb-1">Arrivee</label>
            <input
              type="date"
              className="input-bledi mb-4"
              value={filters.checkIn}
              onChange={(e) => apply({ checkIn: e.target.value })}
            />

            <label className="block text-sm font-medium mb-1">Depart</label>
            <input
              type="date"
              className="input-bledi mb-4"
              value={filters.checkOut}
              onChange={(e) => apply({ checkOut: e.target.value })}
            />

            <label className="block text-sm font-medium mb-1">Voyageurs</label>
            <input
              type="number"
              min={1}
              className="input-bledi mb-4"
              value={filters.guests}
              onChange={(e) => apply({ guests: e.target.value })}
            />

            <label className="block text-sm font-medium mb-1">Budget par nuit (TND)</label>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                placeholder="min"
                className="input-bledi"
                value={filters.minPrice}
                onChange={(e) => apply({ minPrice: e.target.value })}
              />
              <input
                type="number"
                placeholder="max"
                className="input-bledi"
                value={filters.maxPrice}
                onChange={(e) => apply({ maxPrice: e.target.value })}
              />
            </div>

            <button onClick={() => refetch()} className="btn-primary w-full">
              {isFetching ? 'Recherche...' : 'Actualiser'}
            </button>
          </aside>

          {/* Resultats */}
          <section>
            {!datesChoisies ? (
              <Empty>
                <span className="block font-medium text-charcoal mb-1">
                  Choisissez vos dates d arrivee et de depart
                </span>
                La disponibilite depend des dates : sans elles, la liste contiendrait des
                logements deja reserves ou fermes par leur proprietaire.
              </Empty>
            ) : isLoading ? (
              <Spinner />
            ) : error ? (
              <ErrorBox error={error} />
            ) : !data?.items?.length ? (
              <Empty>
                Aucun logement disponible a ces dates.
                <div className="text-sm mt-2">
                  Essayez d elargir la periode ou de changer de destination.
                </div>
              </Empty>
            ) : (
              <>
                <div className="text-slate mb-4">
                  {data.total} logement{data.total > 1 ? 's' : ''} disponible
                  {data.total > 1 ? 's' : ''}
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.items.map((l: any) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Resultats />
    </Suspense>
  );
}
