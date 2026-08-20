'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Heart, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import FavoriteButton from '@/components/FavoriteButton';
import { Spinner, ErrorBox, Empty } from '@/components/ui';
import { photoOf, CERTIFICATIONS } from '@/lib/format';
import { useMoney } from '@/store/preferences';

/**
 * Mes favoris.
 *
 * Un logement retire de la diffusion RESTE affiche, grise et signale. Le faire
 * disparaitre donnerait l impression d avoir perdu sa selection alors que le
 * bien existe toujours — et priverait le voyageur de la seule information
 * utile : celui-la n est plus disponible, cherchez ailleurs.
 */
function Favoris() {
  const money = useMoney();

  const { data, isLoading, error } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.favorites(),
  });

  if (isLoading) return <Spinner />;
  if (error)
    return (
      <main className="container mx-auto px-4 py-10">
        <ErrorBox error={error} />
      </main>
    );

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6 flex items-center gap-2">
          <Heart className="w-7 h-7 text-bledi-red fill-bledi-red" />
          Mes favoris
        </h1>

        {!data?.length ? (
          <Empty>
            Aucun logement en favori. Touchez le coeur sur une annonce pour la retrouver ici.
            <div className="mt-3">
              <Link href="/recherche" className="btn-primary inline-block">
                Parcourir les logements
              </Link>
            </div>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.map((f: any) => {
              const l = f.listing;
              const certification = CERTIFICATIONS[l.certificationLevel] || CERTIFICATIONS.none;
              return (
                <div
                  key={f.id}
                  className={`bg-white rounded-bledi shadow-bledi overflow-hidden group ${
                    f.indisponible ? 'opacity-70' : ''
                  }`}
                >
                  <div className="relative h-44">
                    <Image
                      src={photoOf(l)}
                      alt={l.title}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                    <FavoriteButton listingId={l.id} className="absolute top-3 right-3 z-10" />
                    {l.certificationLevel !== 'none' && (
                      <span className={`absolute top-3 left-3 ${certification.className}`}>
                        {certification.label}
                      </span>
                    )}
                    {/* Dire POURQUOI il est grise, plutot que de laisser croire
                        a un defaut d affichage. */}
                    {f.indisponible && (
                      <span className="absolute bottom-3 left-3 bg-charcoal/85 text-white text-xs px-2 py-1 rounded-full">
                        Plus disponible a la reservation
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <Link
                      href={`/logements/${l.slug || l.id}`}
                      className="font-display font-semibold text-charcoal hover:text-bledi-red block truncate"
                    >
                      {l.title}
                    </Link>
                    <p className="text-sm text-slate flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {l.city}
                    </p>
                    <p className="font-accent font-bold text-charcoal mt-2">
                      {money(Number(l.pricePerNight))}
                      <span className="text-sm font-normal text-slate"> / nuit</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <Favoris />
    </RequireAuth>
  );
}
