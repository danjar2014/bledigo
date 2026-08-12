'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, CalendarDays } from 'lucide-react';
import ListingCard from '@/components/ListingCard';
import { api } from '@/lib/api';
import { Spinner, ErrorBox, Empty } from '@/components/ui';


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

  // Le referentiel complet, pas seulement les villes ou une annonce existe :
  // une destination sans disponibilite doit pouvoir etre choisie, pour que la
  // reponse soit « rien a ces dates » et non « cette ville n existe pas ».
  const { data: localites } = useQuery({
    queryKey: ['localities'],
    queryFn: () => api.localities(),
    staleTime: Infinity,
  });

  const aujourdhui = new Date().toISOString().slice(0, 10);
  /** Le depart suit l arrivee : une nuit au minimum. */
  const lendemain = (d: string) => {
    if (!d) return aujourdhui;
    const j = new Date(d);
    j.setDate(j.getDate() + 1);
    return j.toISOString().slice(0, 10);
  };

  const apply = (next: Partial<typeof filters>) => {
    const merged = { ...filters, ...next };
    // Avancer l arrivee au-dela du depart rendrait la periode absurde : on
    // repousse le depart plutot que de laisser un etat invalide.
    if (next.checkIn && merged.checkOut && merged.checkOut <= next.checkIn) {
      merged.checkOut = lendemain(next.checkIn);
    }
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
              {(localites ?? []).map((v: any) => (
                <option key={v.slug} value={v.name} />
              ))}
            </datalist>

            <label className="block text-sm font-medium mb-1">Arrivee</label>
            <input
              type="date"
              className="input-bledi mb-4"
              min={aujourdhui}
              value={filters.checkIn}
              onChange={(e) => apply({ checkIn: e.target.value })}
            />

            <label className="block text-sm font-medium mb-1">Depart</label>
            <input
              type="date"
              className="input-bledi mb-4"
              min={lendemain(filters.checkIn)}
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
              <Suggestions onVille={(v) => apply({ q: v })} />
            ) : isLoading ? (
              <Spinner />
            ) : error ? (
              <ErrorBox error={error} />
            ) : !data?.items?.length ? (
              <Empty>
                <span className="block font-medium text-charcoal mb-1">
                  Pas de disponibilite {filters.q ? `a ${filters.q} ` : ''}sur ces dates
                </span>
                Changez les dates ou choisissez une autre destination.
              </Empty>
            ) : (
              <>
                <div className="text-slate mb-4">
                  {data.total} logement{data.total > 1 ? 's' : ''} disponible
                  {data.total > 1 ? 's' : ''}
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.items.map((l: any) => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      dates={{ checkIn: filters.checkIn, checkOut: filters.checkOut }}
                    />
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

/** Grandes destinations touristiques, proposees avant toute saisie. */
const DESTINATIONS = [
  'Tunis',
  'Hammamet',
  'Sousse',
  'Monastir',
  'Djerba',
  'Sidi Bou Said',
  'Tabarka',
  'Mahdia',
];

/**
 * Ecran d attente de la recherche.
 *
 * Exiger les dates evite d annoncer des logements indisponibles, mais laisse
 * une page vide a l arrivee — ce qui decourage la decouverte. On propose donc
 * des destinations et les logements les mieux notes, qui donnent envie sans
 * rien promettre sur la disponibilite.
 */
function Suggestions({ onVille }: { onVille: (v: string) => void }) {
  const { data } = useQuery({
    queryKey: ['suggestions-mieux-notes'],
    queryFn: () => api.listings({ limit: 6, sortBy: 'rating' }),
  });

  const listings = data?.items ?? [];

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-bledi p-6 shadow-bledi text-center">
        <CalendarDays className="w-8 h-8 text-bledi-gold mx-auto mb-2" />
        <p className="font-display font-semibold text-charcoal">
          Choisissez vos dates pour voir ce qui est disponible
        </p>
        <p className="text-sm text-slate mt-1">
          La disponibilite depend des dates : sans elles, la liste contiendrait des logements
          deja reserves ou fermes par leur proprietaire.
        </p>
      </div>

      <div>
        <h2 className="font-display font-semibold text-charcoal mb-3">Ou aller en Tunisie</h2>
        <div className="flex flex-wrap gap-2">
          {DESTINATIONS.map((v) => (
            <button
              key={v}
              onClick={() => onVille(v)}
              className="px-4 py-2 rounded-full bg-white border border-cloud text-charcoal hover:border-bledi-blue hover:text-bledi-blue text-sm"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {listings.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-charcoal mb-3">Les mieux notes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l: any) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
