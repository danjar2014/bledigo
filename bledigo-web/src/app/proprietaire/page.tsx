'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, KeyRound, Check, CalendarDays, Users, Gauge, ShieldAlert, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorBox, Empty } from '@/components/ui';
import { date, photoOf, BOOKING_STATUS, CERTIFICATIONS } from '@/lib/format';
import { useMoney } from '@/store/preferences';

function Dashboard() {
  const money = useMoney();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: listings, isLoading, error } = useQuery({
    queryKey: ['my-listings', user?.id],
    // Endpoint dedie : inclut les brouillons et les annonces en re-verification,
    // que la recherche publique n expose pas.
    queryFn: () => api.myListings(),
    enabled: !!user,
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'owner'],
    queryFn: () => api.bookings('owner'),
  });

  const confirm = useMutation({
    mutationFn: (id: string) => api.confirmBooking(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const checkIn = useMutation({
    mutationFn: (id: string) => api.checkIn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const revenue = (bookings || [])
    .filter((b: any) => b.payment?.status === 'captured')
    .reduce((sum: number, b: any) => sum + Number(b.totalPrice), 0);

  if (isLoading) return <Spinner />;
  if (error) return <main className="container mx-auto px-4 py-10"><ErrorBox error={error} /></main>;

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-display font-bold text-charcoal">Espace proprietaire</h1>
          <Link href="/proprietaire/annonces/nouvelle" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle annonce
          </Link>
        </div>

        {/* Indicateurs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            ['Mes annonces', listings?.length || 0],
            ['Reservations', bookings?.length || 0],
            ['En attente', (bookings || []).filter((b: any) => b.status === 'pending').length],
            ['Revenus encaisses', money(revenue)],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-white rounded-bledi p-5 shadow-bledi">
              <div className="text-sm text-slate mb-1">{label}</div>
              <div className="font-accent font-bold text-2xl text-charcoal">{value}</div>
            </div>
          ))}
        </div>

        {/* Reservations recues */}
        <h2 className="font-display font-semibold text-xl text-charcoal mb-3">Reservations recues</h2>
        {!bookings?.length ? (
          <Empty>Aucune reservation pour le moment.</Empty>
        ) : (
          <div className="space-y-3 mb-10">
            {bookings.map((b: any) => {
              const status = BOOKING_STATUS[b.status] || { label: b.status, className: 'bg-cloud' };
              return (
                <div key={b.id} className="bg-white rounded-bledi shadow-bledi p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[240px]">
                    <div className="font-medium text-charcoal">{b.listing?.title}</div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-4 h-4" />
                        {date(b.checkIn)} - {date(b.checkOut)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {b.guestsCount}
                      </span>
                    </div>
                  </div>

                  <div className="font-accent font-bold text-charcoal">
                    {money(Number(b.totalPrice))}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>

                  <div className="flex gap-2 ml-auto">
                    {b.status === 'pending' && (
                      <button
                        onClick={() => confirm.mutate(b.id)}
                        className="flex items-center gap-1.5 border-2 border-bledi-blue text-bledi-blue px-3 py-1.5 rounded-bledi-sm text-sm font-medium hover:bg-bledi-blue hover:text-white"
                      >
                        <Check className="w-4 h-4" />
                        Confirmer
                      </button>
                    )}
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => checkIn.mutate(b.id)}
                        className="flex items-center gap-1.5 bg-bledi-blue text-white px-3 py-1.5 rounded-bledi-sm text-sm font-medium hover:opacity-90"
                      >
                        <KeyRound className="w-4 h-4" />
                        Declencher le check-in
                      </button>
                    )}
                    {b.status === 'checked_in' && (
                      <span className="text-xs text-slate">
                        En attente de la validation du voyageur (30 min)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mes annonces */}
        <h2 className="font-display font-semibold text-xl text-charcoal mb-3">Mes annonces</h2>
        {!listings?.length ? (
          <Empty>
            Aucune annonce active. Creez-en une, puis publiez-la pour qu elle apparaisse dans la
            recherche.
          </Empty>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((l: any) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ListingRow({ listing }: { listing: any }) {
  const money = useMoney();
  const queryClient = useQueryClient();
  const score = useMutation({
    mutationFn: () => api.scoreListing(listing.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
  });
  const { data: fraud } = useQuery({
    queryKey: ['fraud', listing.id],
    queryFn: () => api.fraudCheck(listing.id),
  });

  const certification = CERTIFICATIONS[listing.certificationLevel] || CERTIFICATIONS.none;

  return (
    <div className="bg-white rounded-bledi shadow-bledi overflow-hidden">
      <div className="relative h-36">
        <Image src={photoOf(listing)} alt="" fill unoptimized className="object-cover" />
        <span className={`absolute top-2 left-2 ${certification.className}`}>
          {certification.label}
        </span>
      </div>
      <div className="p-4">
        <Link
          href={`/logements/${listing.slug}`}
          className="font-medium text-charcoal hover:text-bledi-blue block truncate"
        >
          {listing.title}
        </Link>
        <div className="text-sm text-slate mb-3">
          {listing.city} - {money(Number(listing.pricePerNight))}/nuit
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Link
            href={`/proprietaire/annonces/${listing.id}/modifier`}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3 py-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </Link>
          <Link
            href={`/proprietaire/annonces/${listing.id}/modifier#historique`}
            className="text-xs text-slate hover:text-bledi-blue"
          >
            Historique
          </Link>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-charcoal">
            <Gauge className="w-4 h-4 text-bledi-blue" />
            {listing.trustScore}/100
          </span>
          {fraud && (
            <span
              className={`flex items-center gap-1 text-xs ${
                fraud.riskLevel === 'high'
                  ? 'text-red-700'
                  : fraud.riskLevel === 'medium'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
              title={fraud.signals?.join(' | ')}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              risque {fraud.riskLevel}
            </span>
          )}
          <button
            onClick={() => score.mutate()}
            className="ml-auto text-xs text-bledi-blue hover:underline"
          >
            {score.isPending ? '...' : 'Recalculer'}
          </button>
        </div>

        {fraud?.signals?.length > 0 && (
          <ul className="mt-2 text-xs text-slate list-disc list-inside">
            {fraud.signals.slice(0, 3).map((s: string) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth roles={['owner', 'agency']}>
      <Dashboard />
    </RequireAuth>
  );
}
