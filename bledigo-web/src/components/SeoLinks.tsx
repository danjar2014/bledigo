'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePreferences } from '@/store/preferences';

/**
 * Maillage interne ville x type de bien.
 * Objectif referencement : chaque combinaison pointe vers une page ville filtrable.
 */
const GROUPS: { title: string; links: { city: string; slug: string; label: string; type?: string }[] }[] = [
  {
    title: 'Locations par ville',
    links: [
      { city: 'Tunis', slug: 'tunis', label: 'Appartements', type: 'apartment' },
      { city: 'Djerba', slug: 'djerba', label: 'Villas', type: 'villa' },
      { city: 'Hammamet', slug: 'hammamet', label: 'Villas', type: 'villa' },
      { city: 'Sousse', slug: 'sousse', label: 'Appartements', type: 'apartment' },
      { city: 'Monastir', slug: 'monastir', label: 'Studios', type: 'studio' },
      { city: 'Nabeul', slug: 'nabeul', label: 'Maisons', type: 'house' },
      { city: 'Sfax', slug: 'sfax', label: 'Appartements', type: 'apartment' },
      { city: 'Bizerte', slug: 'bizerte', label: 'Maisons', type: 'house' },
      { city: 'Mahdia', slug: 'mahdia', label: 'Bungalows', type: 'bungalow' },
      { city: 'Tabarka', slug: 'tabarka', label: 'Bungalows', type: 'bungalow' },
      { city: 'Kelibia', slug: 'kelibia', label: 'Maisons', type: 'house' },
      { city: 'Tozeur', slug: 'tozeur', label: 'Maisons', type: 'house' },
    ],
  },
  {
    title: 'Bord de mer',
    links: [
      { city: 'Sidi Bou Said', slug: 'sidi-bou-said', label: 'Maisons', type: 'house' },
      { city: 'La Marsa', slug: 'la-marsa', label: 'Appartements', type: 'apartment' },
      { city: 'Zarzis', slug: 'zarzis', label: 'Villas', type: 'villa' },
      { city: 'Gammarth', slug: 'gammarth', label: 'Villas', type: 'villa' },
      { city: 'Korba', slug: 'korba', label: 'Appartements', type: 'apartment' },
      { city: 'Ghar El Melh', slug: 'ghar-el-melh', label: 'Maisons', type: 'house' },
      { city: 'Chebba', slug: 'chebba', label: 'Bungalows', type: 'bungalow' },
      { city: 'Skanes', slug: 'skanes', label: 'Studios', type: 'studio' },
    ],
  },
  {
    title: 'Interieur et desert',
    links: [
      { city: 'Kairouan', slug: 'kairouan', label: 'Maisons', type: 'house' },
      { city: 'Douz', slug: 'douz', label: 'Maisons', type: 'house' },
      { city: 'Nefta', slug: 'nefta', label: 'Villas', type: 'villa' },
      { city: 'Matmata', slug: 'matmata', label: 'Maisons', type: 'house' },
      { city: 'Tataouine', slug: 'tataouine', label: 'Maisons', type: 'house' },
      { city: 'Ain Draham', slug: 'ain-draham', label: 'Chalets', type: 'chalet' },
    ],
  },
];

const VISIBLE = 6;

export default function SeoLinks() {
  const t = usePreferences((s) => s.t);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <section className="border-t border-cloud bg-white">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-3">
        {GROUPS.map((group) => {
          const isOpen = expanded[group.title];
          const links = isOpen ? group.links : group.links.slice(0, VISIBLE);
          return (
            <div key={group.title}>
              <h3 className="font-display font-semibold text-charcoal mb-3">{group.title}</h3>
              <ul className="space-y-1.5">
                {links.map((l) => (
                  <li key={`${l.slug}-${l.label}`}>
                    <Link
                      href={`/villes/${l.slug}${l.type ? `?propertyType=${l.type}` : ''}`}
                      className="text-sm text-slate hover:text-bledi-blue transition-colors"
                    >
                      {l.city} · {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {group.links.length > VISIBLE && (
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [group.title]: !isOpen }))}
                  className="mt-3 text-sm font-medium text-bledi-blue hover:underline"
                >
                  {isOpen ? t('common.showLess') : t('common.showMore')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
