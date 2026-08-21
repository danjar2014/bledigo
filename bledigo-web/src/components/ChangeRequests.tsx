'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarX2,
  CalendarClock,
  Check,
  X,
  Clock,
  AlertTriangle,
  Undo2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { date } from '@/lib/format';
import { Spinner } from '@/components/ui';
import { useMoney } from '@/store/preferences';

/**
 * Demandes d annulation et de report : celles a traiter, et les siennes.
 *
 * Le meme composant sert l hote, l agence et le voyageur. Ce qui change d un
 * role a l autre n est pas la liste mais le SENS de la demande — recue ou
 * envoyee — et c est deja ce que le serveur distingue.
 */
export default function ChangeRequests() {
  const queryClient = useQueryClient();
  const money = useMoney();
  const [note, setNote] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['change-requests'],
    queryFn: () => api.myChangeRequests(),
  });

  const repondre = useMutation({
    mutationFn: ({ id, accepte }: { id: string; accepte: boolean }) =>
      api.respondChange(id, accepte, note[id]),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const retirer = useMutation({
    mutationFn: (id: string) => api.withdrawChange(id),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (isLoading) return <Spinner />;
  if (!data?.envoyees.length && !data?.recues.length) return null;

  /** Temps restant avant que le silence vaille acceptation. */
  const restant = (echeance: string) => {
    const h = Math.max(0, Math.round((new Date(echeance).getTime() - Date.now()) / 3600000));
    if (h < 1) return 'moins d une heure';
    if (h < 24) return `${h} h`;
    return `${Math.round(h / 24)} jour(s)`;
  };

  /**
   * Le montant actuel de la reservation, pour la comparaison.
   *
   * Il vit sur `totalPrice` cote sejour et sur `price` cote location : deux
   * tables, deux noms. `null` quand la relation n a pas ete chargee, auquel cas
   * on montre le nouveau prix seul plutot qu une comparaison fausse.
   */
  const ancienPrix = (d: any): number | null => {
    const v = d.booking?.totalPrice ?? d.serviceBooking?.price;
    return v == null ? null : Number(v);
  };

  const Entete = ({ d }: { d: any }) => (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        {d.kind === 'annulation' ? (
          <CalendarX2 className="w-4 h-4 text-bledi-red shrink-0" />
        ) : (
          <CalendarClock className="w-4 h-4 text-bledi-red shrink-0" />
        )}
        <span className="font-medium text-charcoal">{d.titre}</span>
      </div>
      {d.wasLate && (
        <span className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
          tardive
        </span>
      )}
    </div>
  );

  const Detail = ({ d }: { d: any }) => (
    <>
      <p className="text-sm text-slate mt-1">
        {d.kind === 'annulation'
          ? 'Annulation demandee'
          : `Report demande du ${date(d.newStartDate)} au ${date(d.newEndDate)}`}{' '}
        — motif : <span className="text-charcoal">{d.motifLabel}</span>
      </p>
      {d.reasonText && (
        <p className="text-sm text-slate italic mt-0.5">« {d.reasonText} »</p>
      )}
      {/*
        LE NOUVEAU PRIX, sans quoi on accepte un montant qu on n a jamais vu.

        Les tarifs sont lus nuit par nuit dans le calendrier de l hote ou de
        l agence : deplacer un sejour sur une periode de haute saison peut le
        rencherir fortement, et c est precisement ce que celui qui accepte doit
        savoir avant de cliquer. Le montant est fige depuis la demande — il ne
        bougera plus, meme si le calendrier change entre-temps.
      */}
      {d.kind === 'modification_dates' && d.newPrice != null && (
        <p className="text-sm mt-1">
          <span className="text-slate">Nouveau total : </span>
          <span className="font-accent font-bold text-charcoal">{money(Number(d.newPrice))}</span>
          {ancienPrix(d) != null && Number(d.newPrice) !== ancienPrix(d) && (
            <span className="text-slate">
              {' '}au lieu de {money(ancienPrix(d)!)}
              <span className={Number(d.newPrice) > ancienPrix(d)! ? 'text-amber-800' : 'text-emerald-700'}>
                {' '}({Number(d.newPrice) > ancienPrix(d)! ? '+' : ''}
                {money(Number(d.newPrice) - ancienPrix(d)!)})
              </span>
            </span>
          )}
          <span className="block text-xs text-slate">
            Tarifs du calendrier pour les nouvelles dates. Montant fige depuis la demande.
          </span>
        </p>
      )}
      {/*
        Les conditions FIGEES au moment de la demande, pas celles d aujourd hui :
        l hote a pu changer son delai depuis, et c est l ancien qui a ete oppose.
      */}
      {d.conditions?.delaiJours != null && (
        <p className="text-xs text-slate mt-1">
          Conditions opposees : annulation libre jusqu au {date(d.conditions.libreJusquA)}.
        </p>
      )}
    </>
  );

  return (
    <section id="demandes" className="mt-8 scroll-mt-24">
      <h2 className="text-xl font-display font-bold text-charcoal mb-3">
        Demandes d annulation et de report
      </h2>

      {/* ------------------------------------------------ a traiter */}
      {data.recues.filter((d: any) => d.status === 'pending').length > 0 && (
        <div className="space-y-3 mb-5">
          {data.recues
            .filter((d: any) => d.status === 'pending')
            .map((d: any) => (
              <div
                key={d.id}
                className="bg-white rounded-bledi shadow-bledi p-4 border-s-4 border-bledi-red"
              >
                <Entete d={d} />
                <Detail d={d} />

                <p className="flex items-start gap-1.5 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-bledi-sm p-2 mt-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  {/* L echeance est l information qui decide : sans reponse, la
                      demande passe seule, et le taire serait un piege. */}
                  Sans reponse de votre part, cette demande prend effet dans {restant(d.autoAcceptAt)}.
                </p>

                <input
                  className="input-bledi mt-2 text-sm"
                  placeholder="Un mot de reponse (facultatif)"
                  value={note[d.id] ?? ''}
                  onChange={(e) => setNote({ ...note, [d.id]: e.target.value })}
                />

                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => repondre.mutate({ id: d.id, accepte: true })}
                    disabled={repondre.isPending}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-bledi-sm text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Accepter
                  </button>
                  <button
                    onClick={() => repondre.mutate({ id: d.id, accepte: false })}
                    disabled={repondre.isPending}
                    className="flex items-center gap-1.5 border border-cloud text-charcoal px-4 py-2 rounded-bledi-sm text-sm font-medium hover:border-bledi-red hover:text-bledi-red disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Refuser
                  </button>
                </div>

                {repondre.error && (
                  <p className="text-sm text-red-700 mt-2">{(repondre.error as Error).message}</p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* ------------------------------------------------ les miennes */}
      {data.envoyees.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate">Mes demandes</h3>
          {data.envoyees.map((d: any) => {
            const enAttente = d.status === 'pending';
            // Une echeance depassee vaut acceptation. L annoncer comme une
            // reponse laisserait croire que l autre partie s est prononcee.
            const parDefaut = d.status === 'expired';
            const acceptee = d.status === 'accepted' || parDefaut;

            return (
              <div key={d.id} className="bg-white rounded-bledi shadow-bledi p-4">
                <Entete d={d} />
                <Detail d={d} />

                {enAttente ? (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <p className="flex items-center gap-1.5 text-sm text-slate">
                      <Clock className="w-4 h-4" />
                      En attente — effet automatique dans {restant(d.autoAcceptAt)}.
                    </p>
                    <button
                      onClick={() => retirer.mutate(d.id)}
                      disabled={retirer.isPending}
                      className="flex items-center gap-1.5 ms-auto text-sm text-slate hover:text-bledi-red disabled:opacity-50"
                    >
                      <Undo2 className="w-4 h-4" />
                      Retirer
                    </button>
                  </div>
                ) : (
                  <p
                    className={`flex items-start gap-1.5 text-sm mt-2 ${
                      acceptee ? 'text-emerald-700' : 'text-charcoal'
                    }`}
                  >
                    {acceptee ? (
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    )}
                    <span>
                      {acceptee
                        ? parDefaut
                          ? 'Sans reponse dans le delai, votre demande a pris effet.'
                          : 'Acceptee.'
                        : d.status === 'withdrawn'
                          ? 'Retiree.'
                          : 'Refusee — votre reservation reste en place.'}
                      {d.responseNote && (
                        <span className="text-slate italic"> « {d.responseNote} »</span>
                      )}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
