'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import CityAutocomplete from '@/components/CityAutocomplete';
import { PROPERTY_TYPES, FEATURED_AMENITIES } from '@/lib/catalog';
import AmenityIcon from '@/components/AmenityIcon';
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
    /**
     * Le nombre d ENFANTS, repris de l URL.
     *
     * Il ne sert pas a la capacite — `guests` porte deja le total — mais a
     * ecarter les logements dont l hote n accepte pas les enfants. Sans lui
     * dans l etat, arriver sur la page depuis un lien partage perdait
     * l information et rendait des logements qui refusent la famille.
     */
    enfants: params.get('enfants') || '',
    minPrice: '',
    maxPrice: '',
    propertyType: '',
    bedrooms: '',
    minRating: '',
    certificationLevel: '',
    amenities: [] as string[],
  });

  /** Les criteres fins restent replies : ils encombrent le premier regard. */
  const [avances, setAvances] = useState(false);

  // Les dates commandent la disponibilite : sans elles, la liste afficherait
  // des logements que l hote a fermes ou qui sont deja reserves.
  const datesChoisies = filters.checkIn !== '' && filters.checkOut !== '';

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => api.search(filters),
    enabled: datesChoisies,
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
    const qs = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(merged)) {
      if (Array.isArray(valeur)) valeur.forEach((v) => qs.append(cle, v));
      else if (valeur) qs.set(cle, String(valeur));
    }
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
            <div className="mb-4">
              <CityAutocomplete value={filters.q} onChange={(v) => apply({ q: v })} />
            </div>

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
            {/* Criteres fins, replies par defaut : le voyageur ouvre s il en a besoin. */}
            <button
              onClick={() => setAvances((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-medium text-charcoal py-2 border-t border-cloud"
            >
              Filtres avances
              {avances ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {avances && (
              <div className="mb-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type de logement</label>
                  <select
                    className="input-bledi"
                    value={filters.propertyType}
                    onChange={(e) => apply({ propertyType: e.target.value })}
                  >
                    <option value="">Tous les types</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Chambres min.</label>
                    <input
                      type="number"
                      min={0}
                      className="input-bledi"
                      value={filters.bedrooms}
                      onChange={(e) => apply({ bedrooms: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Note min.</label>
                    <select
                      className="input-bledi"
                      value={filters.minRating}
                      onChange={(e) => apply({ minRating: e.target.value })}
                    >
                      <option value="">Toutes</option>
                      <option value="3">3 et plus</option>
                      <option value="4">4 et plus</option>
                      <option value="4.5">4,5 et plus</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Certification</label>
                  <select
                    className="input-bledi"
                    value={filters.certificationLevel}
                    onChange={(e) => apply({ certificationLevel: e.target.value })}
                  >
                    <option value="">Toutes</option>
                    <option value="diamond">Diamant</option>
                    <option value="gold">Or</option>
                    <option value="silver">Argent</option>
                    <option value="bronze">Bronze</option>
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-medium mb-2">Equipements</span>
                  {/* Tuiles a icones plutot que cases a cocher.
                      Le formulaire de creation d annonce utilisait deja cette
                      forme : la recherche affichait des cases nues pour les
                      MEMES equipements, si bien qu on ne reconnaissait pas
                      d un ecran a l autre ce qu on venait de choisir. */}
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pe-1">
                    {FEATURED_AMENITIES.map((a) => {
                      const actif = filters.amenities.includes(a.key);
                      return (
                        <button
                          key={a.key}
                          type="button"
                          aria-pressed={actif}
                          onClick={() =>
                            apply({
                              amenities: actif
                                ? filters.amenities.filter((k) => k !== a.key)
                                : [...filters.amenities, a.key],
                            })
                          }
                          className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-bledi-sm text-xs text-center transition-all ${
                            actif
                              ? 'border-2 border-charcoal bg-cream text-charcoal font-medium'
                              : 'border border-cloud bg-white text-slate hover:border-charcoal'
                          }`}
                        >
                          <AmenityIcon name={a.icon} className="w-5 h-5" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate mt-2">
                    Un logement doit posseder TOUS les equipements coches.
                  </p>
                </div>
              </div>
            )}



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
        <CalendarDays className="w-8 h-8 text-bledi-red mx-auto mb-2" />
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
