'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Home, Hotel, Bed, Waves, Mountain, Sparkles, TreePalm } from 'lucide-react';
import { api } from '@/lib/api';
import { usePreferences } from '@/store/preferences';

/** Types de biens de la plateforme + raccourcis par equipement. */
const TILES: { key: string; label: string; icon: any; href: string }[] = [
  { key: 'apartment', label: 'Appartement', icon: Building2, href: '/recherche?propertyType=apartment' },
  { key: 'villa', label: 'Villa', icon: Home, href: '/recherche?propertyType=villa' },
  { key: 'house', label: 'Maison', icon: Hotel, href: '/recherche?propertyType=house' },
  { key: 'studio', label: 'Studio', icon: Bed, href: '/recherche?propertyType=studio' },
  { key: 'riad', label: 'Riad', icon: Sparkles, href: '/recherche?propertyType=riad' },
  { key: 'bungalow', label: 'Bungalow', icon: TreePalm, href: '/recherche?propertyType=bungalow' },
  { key: 'sea_view', label: 'Vue sur mer', icon: Waves, href: '/recherche?amenity=Vue+mer' },
  { key: 'chalet', label: 'Chalet', icon: Mountain, href: '/recherche?propertyType=chalet' },
];

export default function PropertyTypeTiles() {
  const t = usePreferences((s) => s.t);

  const { data: counts } = useQuery({
    queryKey: ['property-types'],
    queryFn: () => api.propertyTypes(),
    staleTime: 5 * 60 * 1000,
  });

  const countOf = (key: string) =>
    counts?.find((c: any) => c.type === key)?.count as number | undefined;

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-2xl font-display font-bold text-charcoal mb-6">{t('home.types.title')}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const count = countOf(tile.key);
          return (
            <Link
              key={tile.key}
              href={tile.href}
              className="group flex flex-col items-center gap-2 p-4 bg-white rounded-bledi border border-cloud
                         hover:border-bledi-blue hover:shadow-bledi transition-all"
            >
              <Icon className="w-6 h-6 text-slate group-hover:text-bledi-blue transition-colors" />
              <span className="text-sm font-medium text-charcoal text-center">{tile.label}</span>
              {count != null && (
                <span className="text-xs text-slate">
                  {count} {t('city.properties')}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
