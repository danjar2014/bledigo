'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Users, BedDouble, Bath, Shield, Star, Check, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import ReviewsSection from '@/components/ReviewsSection';
import ListingFeatures from '@/components/ListingFeatures';
import { useAuth } from '@/store/auth';
import { date, nights, photoOf, CERTIFICATIONS } from '@/lib/format';
import { useMoney } from '@/store/preferences';
import { Spinner, ErrorBox } from '@/components/ui';

export default function ListingPage() {
  const money = useMoney();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState({ checkIn: '', checkOut: '', guestsCount: 2 });
  const [message, setMessage] = useState<string | null>(null);

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.listing(id),
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', listing?.id],
    queryFn: () => api.listingReviews(listing.id),
    enabled: !!listing?.id,
  });

  const booking = useMutation({
    mutationFn: async () => {
      const res = await api.createBooking({ listingId: listing.id, ...form });
      await api.payIntent(res.booking.id);
      return res;
    },
    onSuccess: () => router.push('/reservations'),
    onError: (e: any) => setMessage(e.message),
  });

  if (isLoading) return <Spinner />;
  if (error) return <main className="container mx-auto px-4 py-10"><ErrorBox error={error} /></main>;

  const certification = CERTIFICATIONS[listing.certificationLevel] || CERTIFICATIONS.none;
  const nbNights = form.checkIn && form.checkOut ? nights(form.checkIn, form.checkOut) : 0;
  const total =
    nbNights * Number(listing.pricePerNight) +
    Number(listing.cleaningFee) +
    Number(listing.serviceFee);

  return (
    <main className="min-h-screen bg-cream">
      {/* Galerie */}
      <div className="container mx-auto px-4 pt-6">
        <div className="grid md:grid-cols-4 gap-2 h-[420px] rounded-bledi overflow-hidden">
          <div className="md:col-span-2 md:row-span-2 relative h-full">
            <Image src={photoOf(listing, 0)} alt={listing.title} fill unoptimized className="object-cover" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="relative hidden md:block">
              <Image src={photoOf(listing, i)} alt="" fill unoptimized className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            {listing.certificationLevel !== 'none' && (
              <span className={certification.className}>Certifie {certification.label}</span>
            )}
            <span className="flex items-center gap-1 text-sm text-slate">
              <Shield className="w-4 h-4 text-bledi-blue" />
              Score de confiance {listing.trustScore}/100
            </span>
          </div>

          <h1 className="text-3xl font-display font-bold text-charcoal mb-2">{listing.title}</h1>
          <div className="flex items-center gap-1 text-slate mb-6">
            <MapPin className="w-4 h-4" />
            {listing.address}, {listing.city}, {listing.region}
          </div>

          <div className="flex flex-wrap gap-6 py-4 border-y border-cloud mb-6 text-charcoal">
            <span className="flex items-center gap-2"><Users className="w-5 h-5 text-slate" />{listing.maxGuests} voyageurs</span>
            <span className="flex items-center gap-2"><BedDouble className="w-5 h-5 text-slate" />{listing.bedrooms} chambres</span>
            <span className="flex items-center gap-2"><Bath className="w-5 h-5 text-slate" />{listing.bathrooms} salles de bain</span>
            <span className="capitalize text-slate">{listing.propertyType}</span>
          </div>

          <h2 className="font-display font-semibold text-xl mb-2">Description</h2>
          <p className="text-slate leading-relaxed mb-8 whitespace-pre-line">{listing.description}</p>

          <ListingFeatures listing={listing} />

          <ReviewsSection
            listingId={listing.id}
            avgRating={reviews?.avgRating}
            totalReviews={reviews?.total}
            criteriaAvg={reviews?.criteriaAvg}
            breakdown={reviews?.breakdown}
            reviews={reviews?.reviews ?? reviews?.items}
          />
        </div>

        {/* Widget de reservation */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="bg-white rounded-bledi shadow-bledi-hover p-5">
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-2xl font-accent font-bold text-charcoal">
                {money(Number(listing.pricePerNight))}
              </span>
              <span className="text-slate">/ nuit</span>
            </div>

            <label className="block text-sm font-medium mb-1">Arrivee</label>
            <input
              type="date"
              className="input-bledi mb-3"
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            />
            <label className="block text-sm font-medium mb-1">Depart</label>
            <input
              type="date"
              className="input-bledi mb-3"
              value={form.checkOut}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            />
            <label className="block text-sm font-medium mb-1">Voyageurs</label>
            <input
              type="number"
              min={1}
              max={listing.maxGuests}
              className="input-bledi mb-4"
              value={form.guestsCount}
              onChange={(e) => setForm({ ...form, guestsCount: Number(e.target.value) })}
            />

            {nbNights > 0 && (
              <div className="text-sm space-y-1 border-t border-cloud pt-3 mb-4">
                <div className="flex justify-between text-slate">
                  <span>{money(Number(listing.pricePerNight))} x {nbNights} nuits</span>
                  <span>{money(nbNights * Number(listing.pricePerNight))}</span>
                </div>
                <div className="flex justify-between text-slate">
                  <span>Frais de menage</span>
                  <span>{money(Number(listing.cleaningFee))}</span>
                </div>
                <div className="flex justify-between text-slate">
                  <span>Frais de service</span>
                  <span>{money(Number(listing.serviceFee))}</span>
                </div>
                <div className="flex justify-between font-semibold text-charcoal pt-2 border-t border-cloud">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            )}

            {message && <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-3">{message}</div>}

            {!user ? (
              <a href="/connexion" className="btn-primary w-full block text-center">
                Se connecter pour reserver
              </a>
            ) : (
              <button
                onClick={() => booking.mutate()}
                disabled={!form.checkIn || !form.checkOut || booking.isPending}
                className="btn-primary w-full disabled:opacity-50"
              >
                {booking.isPending ? 'Reservation...' : 'Reserver'}
              </button>
            )}

            <div className="mt-4 space-y-2 text-xs text-slate">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 text-bledi-blue" />
                Votre paiement est bloque et n est verse au proprietaire qu apres votre validation.
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                30 minutes apres le check-in pour verifier la conformite du logement.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
