'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useMoney } from '@/store/preferences';

/**
 * Negociation du tarif d une prestation de menage.
 *
 * Le meme composant sert les deux camps : le sens se deduit de qui appelle,
 * cote serveur, exactement comme pour les avis. Le laisser choisir ici
 * permettrait a un prestataire de repondre au nom de son client.
 *
 * Ce qui est montre importe autant que ce qui est envoye : chacun voit le
 * dernier chiffre de l autre, et le nombre de tours restants. Une negociation
 * dont on ignore combien de temps elle peut durer n en est pas une.
 */

/** Doit rester aligne sur TOURS_DE_NEGOCIATION cote serveur. */
const TOURS_MAX = 3;

export default function PriceNegotiation({
  demande,
  role,
}: {
  demande: any;
  role: 'client' | 'prestataire';
}) {
  const money = useMoney();
  const queryClient = useQueryClient();
  const [montant, setMontant] = useState('');

  const rafraichir = () => {
    // Les deux camps regardent la meme demande sous deux cles differentes :
    // n en invalider qu une laisserait l autre afficher un tarif perime.
    queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    queryClient.invalidateQueries({ queryKey: ['provider'] });
    setMontant('');
  };

  const contreProposer = useMutation({
    mutationFn: (prix: number) =>
      role === 'prestataire'
        ? api.providerCounterPrice(demande.id, prix)
        : api.counterServicePrice(demande.id, prix),
    onSuccess: rafraichir,
  });

  const accepter = useMutation({
    mutationFn: () =>
      role === 'prestataire' ? api.providerAccept(demande.id) : api.acceptServicePrice(demande.id),
    onSuccess: rafraichir,
  });

  // Chacun accepte le chiffre de l AUTRE : on n accepte pas ce qu on a ecrit
  // soi-meme, et c est ce qui rend l acceptation symetrique utile.
  const chiffreDeLAutre = role === 'prestataire' ? demande.proposedPrice : demande.counterPrice;
  const monDernierChiffre = role === 'prestataire' ? demande.counterPrice : demande.proposedPrice;
  const toursRestants = TOURS_MAX - (demande.negotiationRound ?? 0);

  if (demande.type !== 'menage' || demande.status !== 'pending') return null;

  return (
    <div className="mt-3 border-t border-cloud pt-3">
      <p className="text-sm font-medium text-charcoal flex items-center gap-2 mb-2">
        <HandCoins className="w-4 h-4 text-bledi-red" />
        Tarif
      </p>

      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <span className="text-slate">
          {role === 'prestataire' ? 'Propose par le client' : 'Votre proposition'} :{' '}
          <strong className="text-charcoal">
            {demande.proposedPrice != null ? money(Number(demande.proposedPrice)) : '—'}
          </strong>
        </span>
        <span className="text-slate">
          {role === 'prestataire' ? 'Votre contre-proposition' : 'Contre-proposition du prestataire'}{' '}
          :{' '}
          <strong className="text-charcoal">
            {demande.counterPrice != null ? money(Number(demande.counterPrice)) : '—'}
          </strong>
        </span>
      </div>

      {chiffreDeLAutre != null && (
        <button
          onClick={() => accepter.mutate()}
          disabled={accepter.isPending || contreProposer.isPending}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-bledi-sm text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 mb-3"
        >
          <Check className="w-4 h-4" />
          Accepter {money(Number(chiffreDeLAutre))}
        </button>
      )}

      {toursRestants > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="block text-slate mb-1">
              {monDernierChiffre != null ? 'Nouvelle proposition' : 'Contre-proposer'}
            </span>
            <input
              type="number"
              min={0}
              className="input-bledi w-36"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder={`en ${demande.currency}`}
            />
          </label>
          <button
            onClick={() => contreProposer.mutate(Number(montant))}
            disabled={!montant || contreProposer.isPending || accepter.isPending}
            className="border-2 border-bledi-blue text-bledi-blue px-3 py-2 rounded-bledi-sm text-sm font-medium hover:bg-bledi-blue hover:text-white disabled:opacity-50"
          >
            Envoyer
          </button>
          <span className="text-xs text-slate pb-2">
            {toursRestants} proposition{toursRestants > 1 ? 's' : ''} restante
            {toursRestants > 1 ? 's' : ''}
          </span>
        </div>
      ) : (
        /* Sans cette borne, une demande resterait ouverte indefiniment et le
           prestataire garderait un creneau libre pour rien. */
        <p className="text-sm text-amber-800 bg-amber-50 rounded p-2">
          Negociation close : il faut maintenant accepter ou refuser.
        </p>
      )}

      {(contreProposer.error || accepter.error) && (
        <p className="text-sm text-red-700 bg-red-50 rounded p-2 mt-2">
          {((contreProposer.error || accepter.error) as Error).message}
        </p>
      )}
    </div>
  );
}
