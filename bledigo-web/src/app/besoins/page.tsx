'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, MapPin, CalendarDays, Users, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Spinner, ErrorBox, Empty } from '@/components/ui';
import { money, date } from '@/lib/format';

export default function BesoinsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    destination: '',
    checkIn: '',
    checkOut: '',
    guestsCount: 2,
    budgetMax: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['reverse-searches'],
    queryFn: () => api.reverseSearches({ limit: 20 }),
  });

  const create = useMutation({
    mutationFn: () =>
      api.createReverseSearch({
        ...form,
        guestsCount: Number(form.guestsCount),
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-searches'] });
      setOpen(false);
    },
  });

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">Recherche inversee</h1>
            <p className="text-slate">
              Publiez votre besoin, les proprietaires viennent a vous avec leurs offres.
            </p>
          </div>
          {user && (
            <button onClick={() => setOpen(!open)} className="btn-primary">
              {open ? 'Fermer' : 'Publier mon besoin'}
            </button>
          )}
        </div>

        {open && (
          <div className="bg-white rounded-bledi shadow-bledi p-6 mb-8 grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Titre</label>
              <input
                className="input-bledi"
                placeholder="Villa avec piscine a Djerba en aout"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="input-bledi h-24"
                placeholder="Ce que vous cherchez, vos contraintes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Destination</label>
              <input
                className="input-bledi"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Budget max / nuit (TND)</label>
              <input
                type="number"
                className="input-bledi"
                value={form.budgetMax}
                onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Arrivee</label>
              <input
                type="date"
                className="input-bledi"
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Depart</label>
              <input
                type="date"
                className="input-bledi"
                value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Voyageurs</label>
              <input
                type="number"
                min={1}
                className="input-bledi"
                value={form.guestsCount}
                onChange={(e) => setForm({ ...form, guestsCount: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              {create.error && (
                <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-3">
                  {(create.error as Error).message}
                </div>
              )}
              <button
                onClick={() => create.mutate()}
                disabled={!form.title || !form.checkIn || !form.checkOut || create.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {create.isPending ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox error={error} />
        ) : !data?.items?.length ? (
          <Empty>Aucun besoin publie pour le moment.</Empty>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {data.items.map((r: any) => (
              <div key={r.id} className="bg-white rounded-bledi shadow-bledi p-5">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-bledi-gold/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-bledi-gold" />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-charcoal">{r.title}</div>
                    <div className="text-xs text-slate">
                      {r.offers?.length || 0} offre{(r.offers?.length || 0) > 1 ? 's' : ''} recue
                      {(r.offers?.length || 0) > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate mb-3 line-clamp-2">{r.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.destination}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{date(r.checkIn)} - {date(r.checkOut)}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{r.guestsCount}</span>
                  {r.budgetMax && (
                    <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" />max {money(Number(r.budgetMax))}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
