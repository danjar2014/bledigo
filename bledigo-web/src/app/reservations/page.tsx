'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Users, Lock, ShieldCheck, Star } from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import ValidationModal from '@/components/ValidationModal';
import ReviewModal from '@/components/ReviewModal';
import { Spinner, ErrorBox, Empty } from '@/components/ui';
import { date, photoOf, BOOKING_STATUS } from '@/lib/format';
import { useMoney } from '@/store/preferences';

function Reservations() {
  const money = useMoney();
  const [validating, setValidating] = useState<any>(null);
  const [reviewing, setReviewing] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', 'traveler'],
    queryFn: () => api.bookings('traveler'),
  });

  if (isLoading) return <Spinner />;
  if (error) return <main className="container mx-auto px-4 py-10"><ErrorBox error={error} /></main>;

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6">Mes reservations</h1>

        {!data?.length ? (
          <Empty>
            Aucune reservation pour le moment.
            <div className="mt-3">
              <Link href="/recherche" className="btn-primary inline-block">
                Trouver un logement
              </Link>
            </div>
          </Empty>
        ) : (
          <div className="space-y-4">
            {data.map((b: any) => {
              const status = BOOKING_STATUS[b.status] || { label: b.status, className: 'bg-cloud' };
              const canValidate = b.status === 'checked_in' && b.validationStatus === 'pending';
              const canReview = b.status === 'completed' && b.validationStatus !== 'disputed';

              return (
                <div key={b.id} className="bg-white rounded-bledi shadow-bledi overflow-hidden flex flex-col md:flex-row">
                  <div className="relative w-full md:w-56 h-40 md:h-auto shrink-0">
                    <Image src={photoOf(b.listing)} alt="" fill unoptimized className="object-cover" />
                  </div>

                  <div className="p-5 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <Link
                        href={`/logements/${b.listing?.slug || b.listingId}`}
                        className="font-display font-semibold text-lg text-charcoal hover:text-bledi-blue"
                      >
                        {b.listing?.title}
                      </Link>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate mb-3">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-4 h-4" />
                        {date(b.checkIn)} au {date(b.checkOut)} ({b.totalNights} nuits)
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {b.guestsCount} voyageurs
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="font-accent font-bold text-lg text-charcoal">
                        {money(Number(b.totalPrice))}
                      </div>
                      {b.payment && (
                        <span className="flex items-center gap-1 text-xs text-slate">
                          <Lock className="w-3.5 h-3.5" />
                          Paiement {b.payment.status === 'held' ? 'bloque' : b.payment.status}
                        </span>
                      )}

                      <div className="ml-auto flex gap-2">
                        {canValidate && (
                          <button
                            onClick={() => setValidating(b)}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-bledi-sm text-sm font-medium hover:bg-emerald-700"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Valider mon sejour
                          </button>
                        )}
                        {canReview && (
                          <button
                            onClick={() => setReviewing(b)}
                            className="flex items-center gap-2 border-2 border-bledi-blue text-bledi-blue px-4 py-2 rounded-bledi-sm text-sm font-medium hover:bg-bledi-blue hover:text-white"
                          >
                            <Star className="w-4 h-4" />
                            Laisser un avis
                          </button>
                        )}
                      </div>
                    </div>

                    {b.status === 'confirmed' && (
                      <p className="text-xs text-slate mt-3">
                        Le proprietaire declenchera le check-in a votre arrivee. Vous aurez alors 30
                        minutes pour verifier le logement.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {validating && <ValidationModal booking={validating} onClose={() => setValidating(null)} />}
      {reviewing && <ReviewModal booking={reviewing} onClose={() => setReviewing(null)} />}
    </main>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <Reservations />
    </RequireAuth>
  );
}
