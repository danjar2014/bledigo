'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Star } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * Avis sur une prestation, dans les deux sens.
 *
 * Le sens n est PAS choisi ici : le serveur le deduit de qui appelle. Un
 * prestataire ne peut donc pas deposer un avis au nom de son client, meme en
 * fabriquant la requete. Le composant se contente d adapter le vocabulaire.
 */
export default function ServiceReviewModal({
  prestation,
  role,
  onClose,
}: {
  prestation: any;
  role: 'client' | 'prestataire';
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const noter = useMutation({
    mutationFn: () => api.rateService(prestation.id, rating, comment || undefined),
    onSuccess: () => {
      // Les agregats du prestataire changent : sa fiche et les listes qui
      // affichent sa note doivent etre reprises.
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['provider'] });
      queryClient.invalidateQueries({ queryKey: ['cleaners'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      onClose();
    },
  });

  const titre =
    role === 'client' ? 'Noter cette prestation' : 'Noter ce client';
  const invite =
    role === 'client'
      ? 'Ponctualite, travail rendu, etat du vehicule...'
      : 'Acces au logement, etat des lieux, respect des horaires...';

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-bledi w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-display font-bold text-xl text-charcoal">{titre}</h2>
          <button onClick={onClose} className="p-1 text-slate hover:text-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dire ce que l avis devient : cote client il est public, cote
            prestataire il ne circule qu entre prestataires. Noter sans savoir
            qui lira n incite pas a la franchise. */}
        <p className="text-sm text-slate mb-4">
          {role === 'client'
            ? 'Votre avis est visible par les autres hotes et voyageurs.'
            : 'Votre avis n est visible que des autres prestataires, comme un passeport de confiance.'}
        </p>

        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} type="button" aria-label={`${n} sur 5`}>
              <Star
                className={`w-8 h-8 ${n <= rating ? 'text-bledi-gold fill-bledi-gold' : 'text-cloud'}`}
              />
            </button>
          ))}
        </div>

        <textarea
          className="input-bledi h-28 mb-4"
          placeholder={invite}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {noter.error && (
          <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-3">
            {(noter.error as Error).message}
          </div>
        )}

        <button
          onClick={() => noter.mutate()}
          disabled={noter.isPending}
          className="btn-primary w-full disabled:opacity-50"
        >
          {noter.isPending ? 'Envoi...' : 'Publier mon avis'}
        </button>
        {/* Le commentaire reste facultatif : exiger un texte pousse au remplissage
            vide et fausse les notes plus qu il ne les eclaire. */}
        <p className="text-xs text-slate mt-2 text-center">
          Le commentaire est facultatif, la note suffit.
        </p>
      </div>
    </div>
  );
}
