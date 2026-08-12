'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Lock, Tag, Moon, Trash2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { usePreferences } from '@/store/preferences';
import { date } from '@/lib/format';
import { Spinner, ErrorBox } from '@/components/ui';

/**
 * Calendrier d un logement, cote hote.
 *
 * Une periode porte trois leviers independants, combinables : fermer les dates,
 * y appliquer un tarif, y imposer une duree minimale. Les fermer sur des dates
 * deja reservees est refuse par l API — cela ne libererait pas le sejour, cela
 * rendrait seulement le calendrier menteur.
 *
 * Bornes : arrivee incluse, depart exclu, comme pour un sejour. Fermer du 10 au
 * 12 rend indisponibles les nuits du 10 et du 11.
 */
export default function OwnerCalendar({ listingId }: { listingId: string }) {
  const { money } = usePreferences();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    blocked: true,
    pricePerNight: '' as number | '',
    minNights: '' as number | '',
    note: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['calendrier', listingId],
    queryFn: () => api.calendrier(listingId),
  });

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['calendrier', listingId] });

  const ajouter = useMutation({
    mutationFn: () =>
      api.ajouterPeriode(listingId, {
        startDate: form.startDate,
        endDate: form.endDate,
        blocked: form.blocked,
        pricePerNight: form.pricePerNight === '' ? null : Number(form.pricePerNight),
        minNights: form.minNights === '' ? null : Number(form.minNights),
        note: form.note || null,
      }),
    onSuccess: () => {
      setForm({ startDate: '', endDate: '', blocked: true, pricePerNight: '', minNights: '', note: '' });
      rafraichir();
    },
  });

  const supprimer = useMutation({
    mutationFn: (periodeId: string) => api.supprimerPeriode(listingId, periodeId),
    onSuccess: rafraichir,
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // Une periode qui ne fait rien n a pas de sens : l API la refuse aussi.
  const utile = form.blocked || form.pricePerNight !== '' || form.minNights !== '';
  const complet = form.startDate !== '' && form.endDate !== '' && utile;

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const periodes = data ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-bledi shadow-bledi p-5">
        <h3 className="font-display font-semibold mb-1 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-bledi-blue" />
          Ajouter une periode
        </h3>
        <p className="text-xs text-slate mb-4">
          Le depart est exclu : du 10 au 12 couvre les nuits du 10 et du 11.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">Debut</label>
            <input
              type="date"
              className="input-bledi"
              value={form.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fin</label>
            <input
              type="date"
              className="input-bledi"
              value={form.endDate}
              onChange={(e) => set({ endDate: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-bledi-sm border border-cloud cursor-pointer hover:bg-cream mb-3">
          <input
            type="checkbox"
            checked={form.blocked}
            onChange={(e) => set({ blocked: e.target.checked })}
            className="w-4 h-4 accent-bledi-blue"
          />
          <span className="text-sm text-charcoal">
            Fermer ces dates
            <span className="block text-xs text-slate">
              Aucune reservation possible, et le logement disparait des recherches sur ces dates.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tarif par nuit <span className="text-slate font-normal">(optionnel)</span>
            </label>
            <input
              type="number"
              min={0}
              className="input-bledi"
              placeholder="Tarif habituel"
              value={form.pricePerNight}
              onChange={(e) => set({ pricePerNight: e.target.value === '' ? '' : Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Sejour minimum <span className="text-slate font-normal">(optionnel)</span>
            </label>
            <input
              type="number"
              min={1}
              className="input-bledi"
              placeholder="Regle du logement"
              value={form.minNights}
              onChange={(e) => set({ minNights: e.target.value === '' ? '' : Number(e.target.value) })}
            />
          </div>
        </div>

        <input
          className="input-bledi mb-3"
          placeholder="Note privee : travaux, usage personnel, haute saison..."
          value={form.note}
          onChange={(e) => set({ note: e.target.value })}
        />

        {!utile && form.startDate !== '' && (
          <p className="text-xs text-amber-700 mb-3">
            Une periode doit au moins fermer les dates, fixer un tarif ou imposer une duree.
          </p>
        )}

        {ajouter.error && <ErrorBox error={ajouter.error} />}

        <button
          onClick={() => ajouter.mutate()}
          disabled={!complet || ajouter.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {ajouter.isPending ? 'Ajout...' : 'Ajouter'}
        </button>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">Periodes definies</h3>
        {periodes.length === 0 ? (
          <p className="text-sm text-slate bg-white rounded-bledi p-6 text-center border border-cloud">
            Aucune periode. Vos dates sont ouvertes au tarif et aux regles du logement.
          </p>
        ) : (
          <ul className="space-y-2">
            {periodes.map((p: any) => (
              <li
                key={p.id}
                className="bg-white rounded-bledi shadow-bledi p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-charcoal">
                    {date(p.startDate)} → {date(p.endDate)}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-sm">
                    {p.blocked && (
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <Lock className="w-3.5 h-3.5" /> Ferme
                      </span>
                    )}
                    {p.pricePerNight != null && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Tag className="w-3.5 h-3.5" /> {money(Number(p.pricePerNight))} / nuit
                      </span>
                    )}
                    {p.minNights != null && (
                      <span className="inline-flex items-center gap-1 text-bledi-blue">
                        <Moon className="w-3.5 h-3.5" /> {p.minNights} nuits minimum
                      </span>
                    )}
                  </div>
                  {p.note && <p className="text-xs text-slate mt-1">{p.note}</p>}
                </div>

                <button
                  onClick={() => supprimer.mutate(p.id)}
                  disabled={supprimer.isPending}
                  aria-label="Supprimer la periode"
                  className="p-2 rounded-bledi-sm text-slate hover:bg-red-50 hover:text-red-700 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {supprimer.error && <ErrorBox error={supprimer.error} />}
      </div>
    </div>
  );
}
