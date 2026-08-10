'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  CalendarDays,
  Users,
  Wallet,
  Pencil,
  Trash2,
  Inbox,
  Check,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePreferences } from '@/store/preferences';
import { date } from '@/lib/format';
import { Spinner, ErrorBox } from '@/components/ui';
import LocalityPicker, { type Locality } from '@/components/LocalityPicker';

const STATUS: Record<string, { label: string; className: string }> = {
  active: { label: 'En cours', className: 'bg-emerald-100 text-emerald-800' },
  fulfilled: { label: 'Offre acceptee', className: 'bg-sky-100 text-sky-800' },
  expired: { label: 'Expiree', className: 'bg-slate-200 text-slate-700' },
  cancelled: { label: 'Retiree', className: 'bg-slate-200 text-slate-700' },
};

function toDateInput(value: string | Date | null | undefined) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

/** Formulaire d edition d une demande, en ligne dans la carte. */
function EditForm({
  search,
  onDone,
  onCancel,
}: {
  search: any;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: search.title ?? '',
    description: search.description ?? '',
    citySlug: search.citySlug ?? '',
    destination: search.destination ?? '',
    city: search.city ?? '',
    checkIn: toDateInput(search.checkIn),
    checkOut: toDateInput(search.checkOut),
    guestsCount: search.guestsCount ?? 2,
    bedrooms: search.bedrooms ?? 1,
    budgetMin: search.budgetMin ?? '',
    budgetMax: search.budgetMax ?? '',
  });

  const save = useMutation({
    mutationFn: () =>
      api.updateReverseSearch(search.id, {
        ...form,
        guestsCount: Number(form.guestsCount),
        bedrooms: Number(form.bedrooms),
        budgetMin: form.budgetMin === '' ? undefined : Number(form.budgetMin),
        budgetMax: form.budgetMax === '' ? undefined : Number(form.budgetMax),
      }),
    onSuccess: onDone,
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Titre</label>
        <input
          className="input-bledi"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Votre besoin</label>
        <textarea
          className="input-bledi h-20"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>

      <LocalityPicker
        id={`locality-${search.id}`}
        label="Destination"
        value={form.citySlug}
        placeholder={form.city || 'Choisir une ville'}
        onChange={(loc: Locality | null) =>
          set({
            citySlug: loc?.slug ?? '',
            city: loc?.name ?? '',
            destination: loc?.name ?? '',
          })
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Arrivee</label>
          <input
            type="date"
            className="input-bledi"
            value={form.checkIn}
            onChange={(e) => set({ checkIn: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Depart</label>
          <input
            type="date"
            className="input-bledi"
            value={form.checkOut}
            onChange={(e) => set({ checkOut: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Voyageurs</label>
          <input
            type="number"
            min={1}
            className="input-bledi"
            value={form.guestsCount}
            onChange={(e) => set({ guestsCount: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Chambres</label>
          <input
            type="number"
            min={0}
            className="input-bledi"
            value={form.bedrooms}
            onChange={(e) => set({ bedrooms: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Budget min / nuit</label>
          <input
            type="number"
            min={0}
            className="input-bledi"
            value={form.budgetMin}
            onChange={(e) => set({ budgetMin: e.target.value as any })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Budget max / nuit</label>
          <input
            type="number"
            min={0}
            className="input-bledi"
            value={form.budgetMax}
            onChange={(e) => set({ budgetMax: e.target.value as any })}
          />
        </div>
      </div>

      {save.error && <ErrorBox error={save.error} />}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
        >
          <Check className="w-4 h-4" />
          {save.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
          <X className="w-4 h-4" />
          Annuler
        </button>
      </div>
    </div>
  );
}

export default function MyReverseSearches() {
  const { money } = usePreferences();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-reverse-searches'],
    queryFn: () => api.reverseSearches({ limit: 30 }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelReverseSearch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-reverse-searches'] }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-bledi shadow-bledi p-10 text-center">
        <Inbox className="w-10 h-10 text-slate mx-auto mb-3" />
        <p className="text-slate mb-4">
          Vous n avez encore publie aucune demande. Decrivez votre besoin et laissez les
          proprietaires venir a vous.
        </p>
        <Link href="/besoins/nouvelle" className="btn-primary inline-block">
          Publier mon besoin
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((s: any) => {
        const status = STATUS[s.status] ?? STATUS.active;
        const offerCount = s._count?.offers ?? s.offerCount ?? 0;
        const editable = s.status === 'active';

        return (
          <li key={s.id} className="bg-white rounded-bledi shadow-bledi p-5">
            {editing === s.id ? (
              <EditForm
                search={s}
                onCancel={() => setEditing(null)}
                onDone={() => {
                  setEditing(null);
                  queryClient.invalidateQueries({ queryKey: ['my-reverse-searches'] });
                }}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <h3 className="font-display font-semibold text-charcoal">{s.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <p className="text-sm text-slate mb-3">{s.description}</p>

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
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/besoins/${s.id}/offres`}
                    className="btn-primary text-sm inline-flex items-center gap-2"
                  >
                    <Inbox className="w-4 h-4" />
                    {offerCount} offre(s) recue(s)
                  </Link>

                  {editable && (
                    <>
                      <button
                        onClick={() => setEditing(s.id)}
                        className="btn-secondary text-sm inline-flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Retirer cette demande ? Les offres en attente seront rejetees.')) {
                            cancel.mutate(s.id);
                          }
                        }}
                        disabled={cancel.isPending}
                        className="text-sm text-red-600 hover:underline inline-flex items-center gap-1 px-2 disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                        Retirer
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
