'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { usePreferences } from '@/store/preferences';

/** Visuel de repli par ville tant qu il n y a pas d image editorialisee. */
function cityImage(slug: string) {
  return `https://picsum.photos/seed/bledigo-${slug}/600/450`;
}

export default function PopularCities({ limit = 6 }: { limit?: number }) {
  const { t, money } = usePreferences();

  const { data: cities, isLoading } = useQuery({
    queryKey: ['cities', limit],
    queryFn: () => api.cities(limit),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="h-8 w-64 bg-cloud rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4 md:h-[420px]">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className={`h-40 md:h-auto bg-cloud rounded-bledi animate-pulse ${
                i === 0 ? 'col-span-2 md:row-span-2' : ''
              }`}
            />
          ))}
        </div>
      </section>
    );
  }

  if (!cities?.length) return null;

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-charcoal">{t('home.cities.title')}</h2>
          <p className="text-slate text-sm">{t('home.cities.subtitle')}</p>
        </div>
      </div>

      {/*
        Mosaique plutot que grille uniforme.
        Six tuiles identiques ne hierarchisaient rien : la destination la plus
        pourvue avait la meme place que la moins pourvue. La premiere occupe
        desormais deux colonnes et deux rangees, les cinq suivantes se rangent
        autour. L ordre vient de l API — la ville la mieux fournie arrive en
        tete — donc la mise en page suit les donnees, elle ne les invente pas.

        En dessous de `md` on revient a deux colonnes egales : sur un telephone,
        une grande tuile suivie de petites donne un empilement illisible.
      */}
      <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4 md:h-[420px]">
        {cities.map((city: any, i: number) => (
          <Link
            key={city.slug}
            href={`/villes/${city.slug}`}
            className={`group relative rounded-bledi overflow-hidden shadow-bledi hover:shadow-bledi-hover transition-all h-40 md:h-auto ${
              i === 0 ? 'md:col-span-2 md:row-span-2 col-span-2' : ''
            }`}
          >
            <Image
              src={cityImage(city.slug)}
              alt={city.name}
              fill
              unoptimized
              sizes={i === 0 ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
            <div className={`absolute inset-x-0 bottom-0 text-white ${i === 0 ? 'p-5' : 'p-3'}`}>
              <div
                className={`flex items-center gap-1.5 font-display font-semibold ${
                  i === 0 ? 'text-2xl' : ''
                }`}
              >
                <MapPin className={i === 0 ? 'w-5 h-5 text-bledi-red' : 'w-4 h-4 text-bledi-red'} />
                {city.name}
              </div>
              <div className={i === 0 ? 'text-sm text-white/85' : 'text-xs text-white/80'}>
                {city.count} {t('city.properties')}
                {city.minPrice != null && ` · ${t('city.from')} ${money(city.minPrice)}`}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
