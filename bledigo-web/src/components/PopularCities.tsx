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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="h-40 bg-cloud rounded-bledi animate-pulse" />
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cities.map((city: any) => (
          <Link
            key={city.slug}
            href={`/villes/${city.slug}`}
            className="group relative h-40 rounded-bledi overflow-hidden shadow-bledi hover:shadow-bledi-hover transition-all"
          >
            <Image
              src={cityImage(city.slug)}
              alt={city.name}
              fill
              unoptimized
              sizes="(max-width: 768px) 50vw, 16vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <div className="flex items-center gap-1 font-display font-semibold">
                <MapPin className="w-4 h-4 text-bledi-gold" />
                {city.name}
              </div>
              <div className="text-xs text-white/80">
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
