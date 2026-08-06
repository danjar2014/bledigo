'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import ListingCard from './ListingCard';
import { api } from '@/lib/api';
import { Spinner, ErrorBox, Empty } from './ui';

const TABS = ['all', 'diamond', 'gold', 'silver'];

export default function FeaturedListings() {
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['listings', activeTab],
    queryFn: () =>
      api.listings({ limit: 4, certificationLevel: activeTab === 'all' ? undefined : activeTab }),
  });

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-2">
              Logements <span className="text-bledi-blue">certifies</span>
            </h2>
            <p className="text-slate">Nos meilleures adresses, verifiees par nos agents terrain</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-bledi-blue text-white' : 'bg-white text-slate hover:bg-cloud'
                }`}
              >
                {tab === 'all' ? 'Tous' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox error={error} />
        ) : !data?.items?.length ? (
          <Empty>Aucune annonce publiee pour ce niveau de certification.</Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.items.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/recherche" className="btn-secondary inline-flex items-center gap-2">
            Voir tous les logements
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
