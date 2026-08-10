'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  CalendarDays,
  Users,
  Wallet,
  Shield,
  CreditCard,
  Info,
  Check,
  X,
  Lock,
  LockOpen,
  MessageSquareReply,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePreferences } from '@/store/preferences';
import { date } from '@/lib/format';
import { Spinner } from '@/components/ui';

/**
 * Demandes de location visibles par le proprietaire.
 *
 * La consultation est gratuite : chaque demande apparait resumee. Un credit
 * n est debite qu au deblocage d une demande precise, et une seule fois : une
 * demande deja ouverte ou deja repondue reste accessible sans nouveau cout.
 */
export default function OwnerRequests() {
  const { money } = usePreferences();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'region' | 'city'>('region');

  const { data: myListings } = useQuery({
    queryKey: ['my-listings-zone'],
    queryFn: () => api.myListings(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['rs-available', scope],
    queryFn: () => api.availableReverseSearches({ scope, limit: 30 }),
    retry: false,
  });

  const unlock = useMutation({
    mutationFn: (id: string) => api.unlockReverseSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rs-available'] });
      queryClient.invalidateQueries({ queryKey: ['rs-credits'] });
    },
  });

  const zoneCities = [...new Set((myListings ?? []).map((l: any) => l.city).filter(Boolean))];
  const remaining = data?.creditsRemaining ?? 0;
  const message = (error as any)?.message as string | undefined;

  if (isLoading) return <Spinner label="Chargement des demandes de votre zone..." />;

  if (message) {
    return (
      <div className="bg-white rounded-bledi shadow-bledi p-8 text-center">
        <p className="text-charcoal mb-4">{message}</p>
        {message.toLowerCase().includes('annonce') && (
          <Link href="/proprietaire/annonces/nouvelle" className="btn-primary inline-block">
            Publier une annonce
          </Link>
        )}
      </div>
    );
  }

  const searches = data?.searches ?? data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Contexte : zone couverte et solde */}
      <div className="bg-white rounded-bledi shadow-bledi p-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-bledi-blue" />
          <span className="text-sm">
            Credits : <strong>{remaining}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="scope" className="text-sm text-slate">
            Perimetre
          </label>
          <select
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'region' | 'city')}
            className="px-3 py-2 rounded-bledi-sm border border-cloud text-sm"
          >
            <option value="region">Ma region</option>
            <option value="city">Mes villes uniquement</option>
          </select>
        </div>

        {zoneCities.length > 0 && (
          <span className="text-sm text-slate">
            Zone : <strong className="text-charcoal">{zoneCities.join(', ')}</strong>
          </span>
        )}

        <Link
          href="/proprietaire/credits"
          className="ms-auto text-sm text-bledi-blue hover:underline"
        >
          Acheter des credits
        </Link>
      </div>

      <div className="flex items-start gap-3 text-sm text-slate">
        <Info className="w-4 h-4 text-bledi-blue shrink-0 mt-0.5" />
        <p>
          Parcourir cette liste est gratuit. Un credit n est debite que lorsque vous ouvrez une
          demande, et une seule fois : une demande deja ouverte ou a laquelle vous avez repondu
          reste accessible.
        </p>
      </div>

      {searches.length === 0 ? (
        <div className="bg-white rounded-bledi shadow-bledi p-10 text-center">
          <p className="text-slate">
            Aucune demande active dans votre zone. Les demandes expirent au bout de 7 jours,
            revenez d ici quelques jours.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate">
            {data.total} demande(s) · {data.lockedCount ?? 0} a ouvrir
          </p>

          <ul className="grid md:grid-cols-2 gap-4">
            {searches.map((s: any) => (
              <li key={s.id} className="bg-white rounded-bledi shadow-bledi p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display font-semibold text-charcoal">{s.title}</h3>
                  {s.answered ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-800 shrink-0">
                      <MessageSquareReply className="w-3.5 h-3.5" />
                      Repondue
                    </span>
                  ) : s.unlocked ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                      <LockOpen className="w-3.5 h-3.5" />
                      Ouverte
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-cloud text-slate shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      1 credit
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate mb-3">{s.description}</p>

                {/* Ces criteres restent visibles sans deblocage : ils servent a decider */}
                <div className="flex flex-wrap gap-3 text-xs text-slate mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {s.city || s.destination}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {date(s.checkIn)} - {date(s.checkOut)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {s.guestsCount}
                  </span>
                  {s.budgetMax != null && (
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5" />
                      max {money(Number(s.budgetMax))}
                    </span>
                  )}
                  {s.traveler?.travelerPassport?.trustScore != null && (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-bledi-blue" />
                      confiance {s.traveler.travelerPassport.trustScore}
                    </span>
                  )}
                </div>

                <div className="mt-auto">
                  {s.unlocked ? (
                    <Link href={`/besoins/${s.id}`} className="btn-primary inline-block text-sm">
                      {s.answered ? 'Revoir la demande' : 'Proposer un logement'}
                    </Link>
                  ) : (
                    <button
                      onClick={() => unlock.mutate(s.id)}
                      disabled={remaining <= 0 || unlock.isPending}
                      className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      <LockOpen className="w-4 h-4" />
                      {unlock.isPending ? 'Ouverture...' : 'Ouvrir (1 credit)'}
                    </button>
                  )}
                  {!s.unlocked && remaining <= 0 && (
                    <span className="block text-xs text-red-600 mt-2">
                      Solde epuise.{' '}
                      <Link href="/proprietaire/credits" className="underline">
                        Acheter des credits
                      </Link>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {unlock.error && (
            <p className="text-sm text-red-600">{(unlock.error as Error).message}</p>
          )}
        </>
      )}
    </div>
  );
}
