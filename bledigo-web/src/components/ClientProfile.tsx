'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserRound, Star, ShieldAlert, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { date } from '@/lib/format';

/**
 * Ce que le prestataire sait de son client AVANT d accepter.
 *
 * Il decidait jusqu ici a l aveugle : le nom n apparaissait qu une fois la
 * demande acceptee, c est-a-dire une fois la decision prise. Or c est
 * exactement au moment de decider qu on a besoin de savoir a qui on confie une
 * voiture ou les cles d un logement.
 *
 * La frontiere des coordonnees ne bouge pas : identite et historique ici,
 * telephone et email seulement apres acceptation. De quoi decider, pas de quoi
 * demarcher.
 *
 * Charge a la demande : afficher trente fiches d un coup ferait trente
 * requetes pour des demandes que le prestataire ne regardera pas.
 */
export default function ClientProfile({ demandeId }: { demandeId: string }) {
  const [ouvert, setOuvert] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-profile', demandeId],
    queryFn: () => api.providerClientProfile(demandeId),
    enabled: ouvert,
  });

  return (
    <div className="mt-3 border-t border-cloud pt-3">
      <button
        onClick={() => setOuvert((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium text-bledi-blue hover:opacity-80"
        aria-expanded={ouvert}
      >
        <UserRound className="w-4 h-4" />
        Qui est ce client ?
        <ChevronDown className={`w-4 h-4 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>

      {ouvert && (
        <div className="mt-3 text-sm">
          {isLoading && <p className="text-slate">Chargement...</p>}
          {error && <p className="text-red-700">{(error as Error).message}</p>}

          {data && (
            <div className="rounded-bledi-sm bg-cream p-3 space-y-2">
              <p className="font-medium text-charcoal">
                {data.nom}
                <span className="font-normal text-slate">
                  {' '}
                  — membre depuis {date(data.membreDepuis)}
                </span>
              </p>

              <div className="flex flex-wrap gap-4 text-slate">
                <span>
                  <strong className="text-charcoal">{data.prestations.total}</strong> prestation
                  {data.prestations.total > 1 ? 's' : ''}
                  {data.prestations.total > 0 && (
                    <> · {data.prestations.terminees} terminee{data.prestations.terminees > 1 ? 's' : ''}</>
                  )}
                  {data.prestations.annulees > 0 && <> · {data.prestations.annulees} annulee(s)</>}
                </span>

                {data.note != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-bledi-gold fill-bledi-gold" />
                    <strong className="text-charcoal">{data.note}</strong>/5 sur {data.avisRecus} avis
                    de prestataires
                  </span>
                ) : (
                  <span>jamais note par un prestataire</span>
                )}
              </div>

              {/* Un sinistre conteste reste affiche : l information utile est
                  qu il y a eu desaccord, pas seulement qui a eu gain de cause. */}
              {data.sinistres.total > 0 ? (
                <p className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 rounded px-2 py-1">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {data.sinistres.total} sinistre{data.sinistres.total > 1 ? 's' : ''} declare
                  {data.sinistres.total > 1 ? 's' : ''} — {data.sinistres.etablis} etabli
                  {data.sinistres.etablis > 1 ? 's' : ''}, {data.sinistres.contestes} conteste
                  {data.sinistres.contestes > 1 ? 's' : ''}
                </p>
              ) : (
                <p className="text-slate">Aucun sinistre declare le concernant.</p>
              )}

              {!data.contact && (
                <p className="text-xs text-slate pt-1 border-t border-cloud">
                  Ses coordonnees vous seront communiquees des l acceptation.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
