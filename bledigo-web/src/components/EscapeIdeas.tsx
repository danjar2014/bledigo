'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePreferences } from '@/store/preferences';

interface Idea {
  city: string;
  slug: string;
  label: string;
}

/** Maillage interne editorial : ville x type de bien, par thematique. */
const THEMES: { key: string; label: string; ideas: Idea[] }[] = [
  {
    key: 'popular',
    label: 'Populaire',
    ideas: [
      { city: 'Djerba', slug: 'djerba', label: 'Locations de villas' },
      { city: 'Hammamet', slug: 'hammamet', label: 'Locations d appartements' },
      { city: 'Sousse', slug: 'sousse', label: 'Locations d appartements' },
      { city: 'Tunis', slug: 'tunis', label: 'Locations de studios' },
      { city: 'Sidi Bou Said', slug: 'sidi-bou-said', label: 'Locations de maisons' },
      { city: 'Monastir', slug: 'monastir', label: 'Locations d appartements' },
      { city: 'Nabeul', slug: 'nabeul', label: 'Locations de villas' },
      { city: 'Mahdia', slug: 'mahdia', label: 'Locations de bungalows' },
    ],
  },
  {
    key: 'coast',
    label: 'Bord de mer',
    ideas: [
      { city: 'Djerba', slug: 'djerba', label: 'Locations de villas' },
      { city: 'Hammamet', slug: 'hammamet', label: 'Locations de villas' },
      { city: 'Kelibia', slug: 'kelibia', label: 'Locations de maisons' },
      { city: 'Tabarka', slug: 'tabarka', label: 'Locations de bungalows' },
      { city: 'Mahdia', slug: 'mahdia', label: 'Locations d appartements' },
      { city: 'Bizerte', slug: 'bizerte', label: 'Locations de maisons' },
      { city: 'Monastir', slug: 'monastir', label: 'Locations de studios' },
      { city: 'Zarzis', slug: 'zarzis', label: 'Locations de villas' },
    ],
  },
  {
    key: 'desert',
    label: 'Sud et desert',
    ideas: [
      { city: 'Tozeur', slug: 'tozeur', label: 'Locations de maisons' },
      { city: 'Douz', slug: 'douz', label: 'Locations de maisons d hotes' },
      { city: 'Tataouine', slug: 'tataouine', label: 'Locations de maisons' },
      { city: 'Nefta', slug: 'nefta', label: 'Locations de villas' },
      { city: 'Matmata', slug: 'matmata', label: 'Locations de maisons troglodytes' },
      { city: 'Gabes', slug: 'gabes', label: 'Locations d appartements' },
    ],
  },
  {
    key: 'cities',
    label: 'Villes et culture',
    ideas: [
      { city: 'Tunis', slug: 'tunis', label: 'Locations d appartements' },
      { city: 'Sfax', slug: 'sfax', label: 'Locations d appartements' },
      { city: 'Kairouan', slug: 'kairouan', label: 'Locations de maisons' },
      { city: 'Sidi Bou Said', slug: 'sidi-bou-said', label: 'Locations de maisons' },
      { city: 'Carthage', slug: 'carthage', label: 'Locations de villas' },
      { city: 'Dougga', slug: 'dougga', label: 'Locations de gites' },
    ],
  },
];

export default function EscapeIdeas() {
  const t = usePreferences((s) => s.t);
  const [active, setActive] = useState(THEMES[0].key);
  const theme = THEMES.find((x) => x.key === active) ?? THEMES[0];

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-2xl font-display font-bold text-charcoal mb-6">{t('home.ideas.title')}</h2>

      <div role="tablist" className="flex flex-wrap gap-2 mb-6 border-b border-cloud">
        {THEMES.map((x) => (
          <button
            key={x.key}
            role="tab"
            aria-selected={active === x.key}
            onClick={() => setActive(x.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === x.key
                ? 'border-bledi-blue text-bledi-blue'
                : 'border-transparent text-slate hover:text-charcoal'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
        {theme.ideas.map((idea) => (
          <Link
            key={`${idea.slug}-${idea.label}`}
            href={`/villes/${idea.slug}`}
            className="group py-1"
          >
            <div className="font-medium text-charcoal group-hover:text-bledi-blue transition-colors">
              {idea.city}
            </div>
            <div className="text-sm text-slate">{idea.label}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
