'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Handshake, CalendarDays, Users, MapPin, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { usePreferences } from '@/store/preferences';
import { date, nights } from '@/lib/format';

/**
 * Contre-propositions recues par le proprietaire.
 *
 * Quand il accepte ou propose un compromis, l offre repart chez le voyageur
 * pour validation finale : c est lui qui declenche la reservation et le
 * paiement, il doit donc toujours avoir le dernier mot.
 */
export default function PendingCounters() {
  const { money } = usePreferences();
  const queryClient = useQueryClient();
  const [compromise, setCompromise] = useState<Record<string, string>>({});

  const { data: counters } = useQuery({
    queryKey: ['pending-counters'],
    queryFn: () => api.pendingCounters(),
  });

  const respond = useMutation({
    mutationFn: ({
      offerId,
      action,
      price,
    }: {
      offerId: string;
      action: 'accept' | 'reject' | 'counter';
      price?: number;
    }) => api.respondToCounter(offerId, action, price),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-counters'] }),
  });

  if (!counters?.length) return null;

  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 font-display font-semibold text-xl text-charcoal mb-1">
        <Handshake className="w-5 h-5 text-bledi-blue" />
        Contre-propositions ({counters.length})
      </h2>
      <p className="text-sm text-slate mb-4">
        Un voyageur propose un autre montant. Votre reponse lui sera renvoyee pour validation.
      </p>

      <ul className="space-y-4">
        {counters.map((o: any) => {
          const nbNights = nights(o.reverseSearch.checkIn, o.reverseSearch.checkOut);
          const gap = Number(o.proposedPrice) - Number(o.counterPrice);
          const value = compromise[o.id] ?? '';

          return (
            <li key={o.id} className="bg-white rounded-bledi shadow-bledi p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display font-semibold text-charcoal">
                    {o.reverseSearch.title}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-xs text-slate mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {o.reverseSearch.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {date(o.reverseSearch.checkIn)} - {date(o.reverseSearch.checkOut)} ({nbNights}{' '}
                      nuits)
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {o.reverseSearch.guestsCount}
                    </span>
                  </div>
                  <p className="text-xs text-slate mt-1">Logement : {o.listing?.title}</p>
                </div>
              </div>

              {/* Comparaison des deux montants */}
              <div className="flex flex-wrap items-center gap-6 p-3 bg-cream rounded-bledi-sm mb-4">
                <div>
                  <div className="text-xs text-slate">Votre offre</div>
                  <div className="font-semibold text-charcoal">
                    {money(Number(o.proposedPrice))} / nuit
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate">Proposition du voyageur</div>
                  <div className="font-semibold text-bledi-blue">
                    {money(Number(o.counterPrice))} / nuit
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate">Ecart sur le sejour</div>
                  <div className="font-semibold text-charcoal">{money(gap * nbNights)}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <button
                  onClick={() => respond.mutate({ offerId: o.id, action: 'accept' })}
                  disabled={respond.isPending}
                  className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  Accepter {money(Number(o.counterPrice))}
                </button>

                <div className="flex items-end gap-2">
                  <div>
                    <label htmlFor={`mid-${o.id}`} className="block text-xs text-slate mb-1">
                      Compromis / nuit
                    </label>
                    <input
                      id={`mid-${o.id}`}
                      type="number"
                      min={Number(o.counterPrice) + 1}
                      max={Number(o.proposedPrice) - 1}
                      value={value}
                      onChange={(e) => setCompromise((c) => ({ ...c, [o.id]: e.target.value }))}
                      placeholder={String(
                        Math.round((Number(o.proposedPrice) + Number(o.counterPrice)) / 2),
                      )}
                      className="input-bledi w-32"
                    />
                  </div>
                  <button
                    onClick={() =>
                      respond.mutate({ offerId: o.id, action: 'counter', price: Number(value) })
                    }
                    disabled={respond.isPending || !value}
                    className="btn-secondary text-sm px-4 py-2 disabled:opacity-60"
                  >
                    Proposer
                  </button>
                </div>

                <button
                  onClick={() => respond.mutate({ offerId: o.id, action: 'reject' })}
                  disabled={respond.isPending}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:underline disabled:opacity-60"
                >
                  <X className="w-4 h-4" />
                  Refuser
                </button>
              </div>

              {respond.error && (
                <p className="text-sm text-red-600 mt-2">{(respond.error as Error).message}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
