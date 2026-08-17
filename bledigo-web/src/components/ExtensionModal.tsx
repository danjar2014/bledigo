'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CalendarPlus, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useMoney } from '@/store/preferences';
import { date } from '@/lib/format';

/**
 * Prolonger un sejour en cours.
 *
 * Le devis est demande AVANT l engagement, et c est le point de cette fenetre :
 * le prix des nuits ajoutees n est pas celui du sejour initial — une extension
 * peut mordre sur une periode saisonniere. Un montant decouvert apres coup
 * n est pas un prix.
 *
 * Le devis sert aussi de test de disponibilite : le serveur refuse des nuits
 * deja prises ou fermees par l hote, et le message remonte tel quel plutot que
 * d etre traduit en « erreur » — le voyageur a besoin de savoir POURQUOI il ne
 * peut pas rester.
 */
export default function ExtensionModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const money = useMoney();
  const queryClient = useQueryClient();

  /**
   * Toute l arithmetique se fait en UTC, et ce n est pas un detail.
   *
   * Les dates de sejour sont stockees a minuit UTC et manipulees partout comme
   * des chaines `YYYY-MM-DD`. Passer par `new Date(...).setDate(+1)` puis
   * `toISOString()` melange les deux referentiels : l heure locale avance d un
   * jour, la conversion en UTC recule, et le voyageur demande une nuit de
   * decalage plutot qu une nuit de plus. Le bogue est invisible en UTC et
   * apparait des qu on change de fuseau.
   */
  const jourSuivant = (iso: string) => {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const depart = String(booking.checkOut).slice(0, 10);

  /** Par defaut une nuit de plus : le cas le plus frequent, et il rend le devis
   *  immediatement lisible sans que le voyageur ait a saisir quoi que ce soit. */
  const [checkOut, setCheckOut] = useState(() => jourSuivant(depart));

  const valide = checkOut > depart;

  const devis = useQuery({
    queryKey: ['extension-devis', booking.id, checkOut],
    queryFn: () => api.extensionQuote(booking.id, checkOut),
    enabled: valide,
    retry: false,
  });

  const demander = useMutation({
    mutationFn: () => api.requestExtension(booking.id, checkOut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-bledi w-full max-w-md p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-charcoal">Prolonger mon sejour</h2>
            <p className="text-sm text-slate">{booking.listing?.title}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate hover:text-charcoal" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-cloud rounded-bledi-sm p-3 mb-4 text-sm text-charcoal">
          Depart prevu le <strong>{date(booking.checkOut)}</strong>
        </div>

        <label className="block text-sm font-medium mb-1" htmlFor="nouveau-depart">
          Nouveau depart
        </label>
        <input
          id="nouveau-depart"
          type="date"
          className="input-bledi mb-4"
          value={checkOut}
          min={jourSuivant(depart)}
          onChange={(e) => setCheckOut(e.target.value)}
        />

        {devis.isFetching && <p className="text-sm text-slate mb-4">Calcul du prix...</p>}

        {devis.error && (
          <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-4">
            {(devis.error as Error).message}
          </div>
        )}

        {devis.data && !devis.isFetching && (
          <div className="border border-cloud rounded-bledi-sm p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate">
                {devis.data.nuitsAjoutees} nuit{devis.data.nuitsAjoutees > 1 ? 's' : ''} de plus
              </span>
              <span className="text-charcoal">{money(devis.data.prix)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate">
              <span>soit {money(devis.data.prixMoyenParNuit)} la nuit</span>
              {/* Dire pourquoi le tarif peut surprendre, plutot que de laisser
                  le voyageur comparer seul avec le prix de son sejour. */}
              <span>tarif de la periode prolongee</span>
            </div>
            <div className="flex justify-between border-t border-cloud pt-2 font-medium">
              <span className="text-charcoal">Total du sejour</span>
              <span className="font-accent font-bold text-charcoal">
                {money(devis.data.totalApresExtension)}
              </span>
            </div>
            <p className="text-xs text-slate pt-1">
              Le menage et les frais de service ne sont pas recomptes.
            </p>
          </div>
        )}

        {devis.data?.accordRequis && (
          <p className="flex items-start gap-2 text-xs text-slate mb-4">
            <Clock className="w-4 h-4 shrink-0 mt-px" />
            Ces nuits appartiennent a l hote : votre demande attend son accord. Le prix affiche
            est celui qui vous sera applique, meme s il repond plus tard.
          </p>
        )}

        {demander.error && (
          <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-3">
            {(demander.error as Error).message}
          </div>
        )}

        <button
          onClick={() => demander.mutate()}
          disabled={!devis.data || devis.isFetching || demander.isPending}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-bledi-sm font-medium text-white bg-bledi-blue hover:opacity-90 disabled:opacity-50"
        >
          <CalendarPlus className="w-5 h-5" />
          {demander.isPending
            ? 'Envoi...'
            : devis.data?.accordRequis
              ? 'Demander a l hote'
              : 'Prolonger mon sejour'}
        </button>
      </div>
    </div>
  );
}
