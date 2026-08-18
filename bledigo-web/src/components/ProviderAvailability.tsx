'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Trash2, Plus, CalendarOff } from 'lucide-react';
import { api } from '@/lib/api';
import { date } from '@/lib/format';
import { Empty } from './ui';

/**
 * Horaires de travail et absences du prestataire.
 *
 * Sans eux, une demande d intervention a 7 h partait vers quelqu un qui
 * commence a 9 h : l hote attendait une reponse qui serait un refus, et le
 * prestataire refusait une demande qui n aurait jamais du lui parvenir.
 *
 * Les creneaux hebdomadaires disent le cas general, les absences l exception.
 * Les deux sont separes pour que fermer une semaine de conges n oblige pas a
 * effacer puis reconstruire ses horaires habituels.
 */

/** Index = valeur de Date.getUTCDay(), pour rester aligne sur le serveur. */
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function ProviderAvailability() {
  const queryClient = useQueryClient();
  const [jour, setJour] = useState(1);
  const [debut, setDebut] = useState('09:00');
  const [fin, setFin] = useState('17:00');
  const [absDebut, setAbsDebut] = useState('');
  const [absFin, setAbsFin] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['provider', 'availability'],
    queryFn: () => api.providerAvailability(),
  });

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['provider', 'availability'] });

  const ajouterCreneau = useMutation({
    mutationFn: () => api.addProviderSlot({ dayOfWeek: jour, startTime: debut, endTime: fin }),
    onSuccess: rafraichir,
  });
  const retirerCreneau = useMutation({
    mutationFn: (id: string) => api.removeProviderSlot(id),
    onSuccess: rafraichir,
  });
  const ajouterAbsence = useMutation({
    mutationFn: () => api.addProviderTimeOff({ startDate: absDebut, endDate: absFin }),
    onSuccess: () => {
      setAbsDebut('');
      setAbsFin('');
      rafraichir();
    },
  });
  const retirerAbsence = useMutation({
    mutationFn: (id: string) => api.removeProviderTimeOff(id),
    onSuccess: rafraichir,
  });

  const parJour = (d: number) => (data?.creneaux ?? []).filter((c: any) => c.dayOfWeek === d);

  return (
    <section className="mb-10">
      <h2 className="text-xl font-display font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-5 h-5 text-bledi-blue" />
        Mes horaires
      </h2>

      <div className="bg-white rounded-bledi shadow-bledi p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Jour
            <select
              className="input-bledi mt-1"
              value={jour}
              onChange={(e) => setJour(Number(e.target.value))}
            >
              {JOURS.map((j, i) => (
                <option key={j} value={i}>
                  {j}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            De
            <input
              type="time"
              className="input-bledi mt-1"
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
            />
          </label>
          <label className="text-sm">
            A
            <input
              type="time"
              className="input-bledi mt-1"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </label>
          <button
            onClick={() => ajouterCreneau.mutate()}
            disabled={ajouterCreneau.isPending || fin <= debut}
            className="btn-primary flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {ajouterCreneau.error && (
          <p className="text-sm text-red-700 bg-red-50 rounded p-2 mt-3">
            {(ajouterCreneau.error as Error).message}
          </p>
        )}

        <div className="mt-4">
          {isLoading && <p className="text-sm text-slate">Chargement...</p>}

          {data && !data.creneaux.length && (
            <Empty>
              Aucun horaire declare. Vous restez propose a toute heure — y compris pour des
              interventions que vous refuserez.
            </Empty>
          )}

          {data && data.creneaux.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {JOURS.map((nom, i) => (
                <div key={nom} className="rounded-bledi-sm bg-cream p-2">
                  <p className="text-xs font-medium text-charcoal mb-1">{nom}</p>
                  {parJour(i).length ? (
                    parJour(i).map((c: any) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 text-xs bg-white rounded px-2 py-1 mr-1 mb-1"
                      >
                        {c.startTime}–{c.endTime}
                        <button
                          onClick={() => retirerCreneau.mutate(c.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Retirer ce creneau"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate">ferme</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- Absences ponctuelles --- */}
        <div className="mt-6 border-t border-cloud pt-4">
          <p className="text-sm font-medium text-charcoal mb-2 flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-slate" />
            Absences
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Du
              <input
                type="date"
                className="input-bledi mt-1"
                value={absDebut}
                onChange={(e) => setAbsDebut(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Au
              <input
                type="date"
                className="input-bledi mt-1"
                value={absFin}
                onChange={(e) => setAbsFin(e.target.value)}
              />
            </label>
            <button
              onClick={() => ajouterAbsence.mutate()}
              disabled={!absDebut || !absFin || absFin <= absDebut || ajouterAbsence.isPending}
              className="border-2 border-bledi-blue text-bledi-blue px-3 py-2 rounded-bledi-sm text-sm font-medium hover:bg-bledi-blue hover:text-white disabled:opacity-50"
            >
              Declarer
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {data?.absences?.map((a: any) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-2 bg-amber-50 text-amber-900 rounded-bledi-sm px-3 py-1.5 text-sm"
              >
                {date(a.startDate)} → {date(a.endDate)}
                <button
                  onClick={() => retirerAbsence.mutate(a.id)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Retirer cette absence"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
