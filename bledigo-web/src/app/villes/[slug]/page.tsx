'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { usePreferences } from '@/store/preferences';
import ListingCard from '@/components/ListingCard';
import { Spinner, ErrorBox } from '@/components/ui';

const PROPERTY_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'apartment', label: 'Appartement' },
  { value: 'villa', label: 'Villa' },
  { value: 'house', label: 'Maison' },
  { value: 'studio', label: 'Studio' },
  { value: 'riad', label: 'Riad' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'chalet', label: 'Chalet' },
  { value: 'penthouse', label: 'Penthouse' },
];

export default function CityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, money } = usePreferences();
  const [propertyType, setPropertyType] = useState('');
  const [guests, setGuests] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['city', slug, propertyType, guests],
    queryFn: () => api.city(slug, { propertyType, guests, limit: 24 }),
  });

  if (isLoading) return <Spinner />;
  if (error)
    return (
      <main className="container mx-auto px-4 py-10">
        <ErrorBox error={error} />
      </main>
    );

  const city = data?.city;
  const items = data?.items ?? [];

  return (
    <main className="min-h-screen bg-cream">
      {/* En-tete */}
      <div className="bg-bledi-blue text-white">
        <div className="container mx-auto px-4 py-10">
          <nav aria-label="Fil d Ariane" className="text-sm text-white/70 mb-3">
            <Link href="/" className="hover:text-white">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <Link href="/recherche" className="hover:text-white">
              {t('nav.search')}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white">{city?.name}</span>
          </nav>

          <h1 className="text-3xl font-display font-bold mb-2">
            Location de vacances a {city?.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-white/80">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-bledi-gold" />
              {city?.region || 'Tunisie'}
            </span>
            <span>
              {city?.count ?? 0} {t('city.properties')}
            </span>
            {city?.latitude != null && (
              <Link
                href={`/carte?lat=${city.latitude}&lng=${city.longitude}&zoom=12`}
                className="flex items-center gap-1 underline hover:text-white"
              >
                <MapIcon className="w-4 h-4" />
                {t('map.title')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="border-b border-cloud bg-white sticky top-16 z-30">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-slate" />
          <label htmlFor="propertyType" className="sr-only">
            Type de bien
          </label>
          <select
            id="propertyType"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="px-3 py-2 rounded-bledi-sm border border-cloud text-sm"
          >
            {PROPERTY_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <label htmlFor="guests" className="sr-only">
            {t('common.guests')}
          </label>
          <select
            id="guests"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="px-3 py-2 rounded-bledi-sm border border-cloud text-sm"
          >
            <option value="">Tous les effectifs</option>
            {[1, 2, 4, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}+ {t('common.guests')}
              </option>
            ))}
          </select>

          <span className="text-sm text-slate ms-auto">
            {data?.total ?? 0} {t('city.properties')}
          </span>
        </div>
      </div>

      {/* Resultats */}
      <div className="container mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="bg-white rounded-bledi shadow-bledi p-10 text-center">
            <p className="text-slate mb-4">{t('city.empty')}</p>
            <Link href="/besoins/nouvelle" className="btn-primary inline-block">
              Publier mon besoin
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      {/* Texte de contexte : utile au referencement */}
      {city?.count > 0 && (
        <section className="container mx-auto px-4 pb-12">
          <div className="bg-white rounded-bledi shadow-bledi p-6 max-w-3xl">
            <h2 className="font-display font-semibold text-lg mb-2">
              Pourquoi reserver a {city.name} avec BlediGo ?
            </h2>
            <p className="text-slate text-sm leading-relaxed">
              Chaque logement propose a {city.name} est verifie par nos agents avant publication :
              photos prises sur place, adresse controlee et proprietaire identifie. Votre paiement
              reste bloque jusqu a votre validation, et vous disposez de 30 minutes apres l arrivee
              pour signaler une non-conformite.
              {data?.items?.[0]?.pricePerNight != null && (
                <>
                  {' '}
                  Les tarifs demarrent {t('city.from')}{' '}
                  {money(Math.min(...data.items.map((l: any) => Number(l.pricePerNight))))}{' '}
                  la {t('common.night')}.
                </>
              )}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
