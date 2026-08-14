'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, CalendarDays } from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner } from './ui';
import { date } from '@/lib/format';

/**
 * Calendrier d un vehicule.
 *
 * Deliberement calque sur celui des logements : une periode ferme des dates ou
 * substitue un tarif, debut inclus, fin exclue. Une agence qui gere aussi un
 * logement n a pas deux systemes a apprendre.
 */
export default function VehicleCalendar({
  vehicle,
  onClose,
}: {
  vehicle: any;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ startDate: '', endDate: '', blocked: true, pricePerDay: '', note: '' });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  const { data: periodes, isLoading } = useQuery({
    queryKey: ['provider', 'vehicle-calendar', vehicle.id],
    queryFn: () => api.providerVehicleCalendar(vehicle.id),
  });

  const rafraichir = () =>
    queryClient.invalidateQueries({ queryKey: ['provider', 'vehicle-calendar', vehicle.id] });

  const ajouter = useMutation({
    mutationFn: (dto: any) => api.providerAddPeriod(vehicle.id, dto),
    onSuccess: () => {
      setForm({ startDate: '', endDate: '', blocked: true, pricePerDay: '', note: '' });
      rafraichir();
    },
  });

  const supprimer = useMutation({
    mutationFn: (periodeId: string) => api.providerRemovePeriod(vehicle.id, periodeId),
    onSuccess: rafraichir,
  });

  const valide = form.startDate && form.endDate && form.endDate > form.startDate;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-bledi shadow-bledi max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-cloud">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-bledi-blue" />
            {vehicle.brand} {vehicle.model}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-cloud rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm">
              Du
              <input
                type="date"
                className="input-bledi w-full mt-1"
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Au <span className="text-slate">(exclu)</span>
              <input
                type="date"
                className="input-bledi w-full mt-1"
                value={form.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.blocked}
                onChange={(e) => set({ blocked: e.target.checked })}
              />
              Vehicule indisponible
            </label>
            <input
              type="number"
              className="input-bledi flex-1 min-w-[140px]"
              placeholder="Tarif special TND / jour"
              value={form.pricePerDay}
              onChange={(e) => set({ pricePerDay: e.target.value })}
            />
          </div>

          <input
            className="input-bledi w-full mt-3"
            placeholder="Note privee : revision, location longue duree..."
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
          />

          <button
            disabled={!valide || ajouter.isPending}
            onClick={() =>
              ajouter.mutate({
                startDate: form.startDate,
                endDate: form.endDate,
                blocked: form.blocked,
                pricePerDay: form.pricePerDay ? Number(form.pricePerDay) : undefined,
                note: form.note || undefined,
              })
            }
            className="btn-primary mt-3 disabled:opacity-50"
          >
            Enregistrer la periode
          </button>
          {ajouter.error ? (
            <p className="text-sm text-red-600 mt-2">{(ajouter.error as any).message}</p>
          ) : null}

          <hr className="my-4 border-cloud" />

          {isLoading ? (
            <Spinner />
          ) : !periodes?.length ? (
            <p className="text-sm text-slate">
              Aucune periode. Le vehicule est propose sur toutes les dates ou il n est pas deja loue.
            </p>
          ) : (
            <ul className="space-y-2">
              {periodes.map((p: any) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-bledi-sm bg-cream"
                >
                  <div className="text-sm">
                    <span className="font-medium">
                      {date(p.startDate)} → {date(p.endDate)}
                    </span>
                    <span className="ml-2 text-slate">
                      {p.blocked ? 'indisponible' : ''}
                      {p.pricePerDay != null ? ` ${p.pricePerDay} TND/j` : ''}
                      {p.note ? ` · ${p.note}` : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => supprimer.mutate(p.id)}
                    className="text-red-600 p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
