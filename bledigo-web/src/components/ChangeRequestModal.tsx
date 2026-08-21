'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CalendarX2, CalendarClock, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useMoney } from '@/store/preferences';
import { date } from '@/lib/format';

type Scope = 'sejour' | 'location';
type Kind = 'annulation' | 'modification_dates';

/**
 * Demander l annulation ou de nouvelles dates.
 *
 * UNE SEULE FENETRE pour les sejours et les locations, et pour les deux gestes.
 * Annuler et decaler sont la meme conversation — « ce qui etait prevu ne l est
 * plus » — et quatre ecrans auraient quadruple ce qu il faut maintenir pour une
 * seule regle.
 *
 * LES CONDITIONS SONT LUES AVANT. Le delai d annulation libre, le texte de
 * l hote et le fait qu un accord soit requis arrivent du serveur AVANT que quoi
 * que ce soit ne soit envoye. Une condition decouverte apres coup n est pas une
 * condition.
 */
export default function ChangeRequestModal({
  scope,
  reservationId,
  onClose,
}: {
  scope: Scope;
  reservationId: string;
  onClose: () => void;
}) {
  const money = useMoney();
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<Kind>('annulation');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonText, setReasonText] = useState('');

  const conditions = useQuery({
    queryKey: ['change-conditions', scope, reservationId],
    queryFn: () => api.changeConditions(scope, reservationId),
  });
  const motifs = useQuery({
    queryKey: ['change-reasons', scope],
    queryFn: () => api.changeReasons(scope),
  });

  /**
   * Toute l arithmetique de dates se fait en UTC.
   *
   * Les dates sont stockees a minuit UTC et manipulees comme des chaines
   * `YYYY-MM-DD`. Melanger les deux referentiels decale d un jour selon le
   * fuseau — invisible en UTC, faux partout ailleurs.
   */
  const jour = (iso?: string) => (iso ? String(iso).slice(0, 10) : '');

  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');

  // Les champs de dates se pre-remplissent avec les dates ACTUELLES : le cas
  // frequent est d en decaler une seule, et tout ressaisir invite a l erreur.
  //
  // Dans un effet, et une seule fois : remplir pendant le rendu re-remplirait
  // les champs des que l utilisateur les viderait tous les deux, ce qui rendrait
  // la saisie impossible.
  const [preRempli, setPreRempli] = useState(false);
  useEffect(() => {
    if (!conditions.data || preRempli) return;
    setDebut(jour(conditions.data.debut));
    setFin(jour(conditions.data.fin));
    setPreRempli(true);
  }, [conditions.data, preRempli]);

  const datesChangees =
    !!debut &&
    !!fin &&
    (debut !== jour(conditions.data?.debut) || fin !== jour(conditions.data?.fin));

  const devis = useQuery({
    queryKey: ['change-quote', scope, reservationId, debut, fin],
    queryFn: () => api.changeQuote(scope, reservationId, debut, fin),
    enabled: kind === 'modification_dates' && datesChangees && fin > debut,
    retry: false,
  });

  const envoyer = useMutation({
    mutationFn: () =>
      api.requestChange({
        scope,
        reservationId,
        kind,
        reasonCode,
        reasonText: reasonText.trim() || undefined,
        ...(kind === 'modification_dates' ? { newStartDate: debut, newEndDate: fin } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      onClose();
    },
  });

  const c = conditions.data;
  const autre = reasonCode === 'autre';
  // « Autre » sans texte ne dit rien : c est exactement le cas ou la phrase est
  // necessaire, puisque aucun code ne convenait.
  const motifComplet = !!reasonCode && (!autre || !!reasonText.trim());
  const datesValides = kind === 'annulation' || (datesChangees && fin > debut && !devis.error);
  const peutEnvoyer = motifComplet && datesValides && !envoyer.isPending;

  return (
    <div className="fixed inset-0 bg-charcoal/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-bledi rounded-t-bledi max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-cloud sticky top-0 bg-white">
          <h2 className="font-display font-semibold text-lg text-charcoal">
            {c?.titre ?? 'Votre reservation'}
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="p-1 hover:bg-cream rounded-full">
            <X className="w-5 h-5 text-slate" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {conditions.isLoading && <p className="text-sm text-slate">Chargement des conditions...</p>}

          {c && (
            <>
              {/* ---------------------------------------- que veut-on faire */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { code: 'annulation' as Kind, label: 'Annuler', icon: CalendarX2 },
                  { code: 'modification_dates' as Kind, label: 'Changer les dates', icon: CalendarClock },
                ].map((k) => {
                  const actif = kind === k.code;
                  return (
                    <button
                      key={k.code}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => setKind(k.code)}
                      className={`flex items-center gap-2 p-3 rounded-bledi-sm text-sm font-medium transition-all ${
                        actif
                          ? 'border-2 border-bledi-red bg-cream text-charcoal'
                          : 'border border-cloud text-slate hover:border-bledi-red'
                      }`}
                    >
                      <k.icon className={`w-4 h-4 ${actif ? 'text-bledi-red' : 'text-slate'}`} />
                      {k.label}
                    </button>
                  );
                })}
              </div>

              {/* ------------------------------------- conditions opposables */}
              <div className="rounded-bledi-sm bg-cream p-3 text-sm space-y-1.5">
                <p className="flex items-center gap-1.5 text-charcoal font-medium">
                  <ShieldCheck className="w-4 h-4 text-bledi-red" />
                  Conditions de cette reservation
                </p>
                <p className="text-slate">
                  {c.annulation.delaiJours == null
                    ? 'Annulation libre jusqu au depart.'
                    : `Annulation libre jusqu au ${date(c.annulation.libreJusquA!)} (${c.annulation.delaiJours} jours avant).`}
                </p>
                {c.annulation.conditions && (
                  <p className="text-slate whitespace-pre-line">{c.annulation.conditions}</p>
                )}
                {/*
                  Le point a dire en toutes lettres : le paiement se fait de la
                  main a la main, la plateforme ne tient aucun fonds et ne peut
                  donc rien prelever. Laisser croire a une retenue serait mentir.
                */}
                <p className="text-xs text-slate/90 border-t border-cloud pt-1.5">
                  Ces conditions valent sur l honneur : le reglement se faisant directement entre
                  vous, BlediGo ne prend et ne rend aucun montant.
                </p>
              </div>

              {c.annulation.tardiveMaintenant && (
                <p className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-bledi-sm p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {/* Le retard n empeche rien : il est consigne, et c est ce que
                      le message doit dire plutot que de laisser croire a un blocage. */}
                  Vous etes hors du delai libre. Votre demande reste possible, mais elle sera
                  enregistree comme tardive.
                </p>
              )}

              {/* ------------------------------------------ nouvelles dates */}
              {kind === 'modification_dates' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      {scope === 'sejour' ? 'Arrivee' : 'Prise du vehicule'}
                      <input
                        type="date"
                        className="input-bledi mt-1"
                        value={debut}
                        onChange={(e) => setDebut(e.target.value)}
                      />
                    </label>
                    <label className="text-sm">
                      {scope === 'sejour' ? 'Depart' : 'Restitution'}
                      <input
                        type="date"
                        className="input-bledi mt-1"
                        value={fin}
                        min={debut}
                        onChange={(e) => setFin(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Le devis sert AUSSI de test de disponibilite : le message
                      du serveur remonte tel quel, parce que le demandeur a
                      besoin de savoir POURQUOI ces dates ne marchent pas. */}
                  {devis.error && (
                    <p className="text-sm text-red-700 bg-red-50 rounded-bledi-sm p-2">
                      {(devis.error as Error).message}
                    </p>
                  )}
                  {devis.data && (
                    <div className="rounded-bledi-sm border border-cloud p-3 text-sm">
                      <p className="text-charcoal">
                        {devis.data.unites} {devis.data.uniteLabel} —{' '}
                        <span className="font-accent font-bold">
                          {money(devis.data.nouveauPrix)}
                        </span>
                      </p>
                      {devis.data.nouveauPrix !== devis.data.ancienPrix && (
                        <p className="text-xs text-slate mt-0.5">
                          au lieu de {money(devis.data.ancienPrix)} — ce montant est fige des
                          maintenant, il ne changera pas d ici la reponse.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------- le motif */}
              <div>
                <label className="text-sm font-medium text-charcoal block mb-1.5">
                  Pourquoi ? <span className="text-bledi-red">*</span>
                </label>
                <select
                  className="input-bledi"
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                >
                  <option value="">Choisissez un motif</option>
                  {motifs.data?.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {autre && (
                  <textarea
                    className="input-bledi mt-2"
                    rows={3}
                    placeholder="Precisez en quelques mots"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                  />
                )}
                {!autre && reasonCode && (
                  <textarea
                    className="input-bledi mt-2"
                    rows={2}
                    placeholder="Un mot d explication (facultatif)"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                  />
                )}
              </div>

              {/* ------------------------------------------- ce qui va se passer */}
              <p className="flex items-start gap-2 text-sm text-slate bg-cream rounded-bledi-sm p-3">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-slate" />
                {c.accordRequis ? (
                  <span>
                    {scope === 'location' ? "L agence" : "L hote"} est prevenu et dispose de{' '}
                    {c.heuresPourRepondre} h pour repondre.{' '}
                    {/* L echeance est l information qui decide : sans elle, on ne
                        sait pas si l on attend une heure ou une semaine. */}
                    <strong className="text-charcoal">
                      Sans reponse dans ce delai, votre demande prend effet automatiquement.
                    </strong>
                  </span>
                ) : (
                  <span>
                    Cette reservation n a pas encore ete acceptee :{' '}
                    <strong className="text-charcoal">elle sera annulee immediatement</strong>, sans
                    accord a attendre.
                  </span>
                )}
              </p>

              {envoyer.error && (
                <p className="text-sm text-red-700 bg-red-50 rounded-bledi-sm p-2">
                  {(envoyer.error as Error).message}
                </p>
              )}

              <button
                onClick={() => envoyer.mutate()}
                disabled={!peutEnvoyer}
                className="btn-primary w-full disabled:opacity-50"
              >
                {envoyer.isPending
                  ? 'Envoi...'
                  : c.accordRequis
                    ? 'Envoyer la demande'
                    : 'Annuler ma reservation'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
