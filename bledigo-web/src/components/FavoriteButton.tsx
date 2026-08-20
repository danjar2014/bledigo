'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

/**
 * Coeur de mise en favori.
 *
 * L etat vient d une liste d IDENTIFIANTS chargee une fois pour toute la page,
 * pas d une requete par vignette : une grille de vingt logements ferait sinon
 * vingt appels pour afficher vingt coeurs.
 *
 * Le clic est OPTIMISTE. Attendre la reponse du serveur avant de colorer le
 * coeur donne un bouton qui parait cassé sur une connexion lente — et c est
 * precisement sur mobile en 3G que l on parcourt des annonces. En cas d echec,
 * on remet l etat precedent.
 */
export default function FavoriteButton({
  listingId,
  className = '',
}: {
  listingId: string;
  className?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: ids } = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: () => api.favoriteIds(),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const favori = !!ids?.includes(listingId);

  const basculer = useMutation({
    mutationFn: () => api.toggleFavorite(listingId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favorite-ids'] });
      const avant = queryClient.getQueryData<string[]>(['favorite-ids']) ?? [];
      queryClient.setQueryData<string[]>(
        ['favorite-ids'],
        favori ? avant.filter((i) => i !== listingId) : [...avant, listingId],
      );
      return { avant };
    },
    onError: (_e, _v, contexte) => {
      // Remettre l etat precedent : un coeur qui reste colore alors que rien
      // n a ete enregistre est pire qu un coeur qui ne bouge pas.
      if (contexte?.avant) queryClient.setQueryData(['favorite-ids'], contexte.avant);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return (
    <button
      type="button"
      aria-label={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={favori}
      onClick={(e) => {
        // La vignette entiere est un lien : sans cela, mettre en favori
        // ouvrirait l annonce dans la foulee.
        e.preventDefault();
        e.stopPropagation();
        // Un visiteur non connecte n a pas de favoris a enregistrer. On l envoie
        // se connecter plutot que d avaler le clic en silence.
        if (!user) {
          router.push('/connexion');
          return;
        }
        basculer.mutate();
      }}
      className={`p-2 rounded-full bg-white/90 backdrop-blur transition-transform hover:scale-110 active:scale-95 ${className}`}
    >
      <Heart
        className={`w-4 h-4 transition-colors ${
          favori ? 'text-bledi-red fill-bledi-red' : 'text-charcoal'
        }`}
      />
    </button>
  );
}
