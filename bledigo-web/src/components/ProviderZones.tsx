'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Trash2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import LocalityPicker, { type Locality } from './LocalityPicker';
import { Empty } from './ui';

/**
 * Zones d intervention declarees par le prestataire.
 *
 * Il ne pouvait rien en dire jusqu ici : il ouvrait son espace et n y trouvait
 * que des demandes recues, sans aucun moyen d influer sur celles qui lui
 * arrivaient. Le seul critere etait un rayon en kilometres saisi a
 * l inscription — un cercle qui ne connait ni les routes ni les habitudes.
 *
 * On choisit dans une LISTE, pas sur une carte : le referentiel est celui des
 * annonces, et c est lui qui permet le rapprochement. Une carte donnerait un
 * point, pas une ville, et se manipule mal depuis un telephone.
 */
export default function ProviderZones() {
  const queryClient = useQueryClient();
  const [choix, setChoix] = useState<Locality | null>(null);
  const [rayon, setRayon] = useState<string>('');

  const { data: zones, isLoading } = useQuery({
    queryKey: ['provider', 'zones'],
    queryFn: () => api.providerZones(),
  });

  /**
   * Le rayon vit ICI et plus a l inscription.
   *
   * Une societe qui candidate ne sait pas encore en kilometres ce qu elle
   * dessert : le chiffre saisi a la va-vite gouvernait pourtant toutes les
   * demandes qu elle recevait ensuite. A cote des villes, il se corrige en
   * connaissance de cause — et on voit du meme coup s il sert encore.
   */
  const { data: profil } = useQuery({
    queryKey: ['provider', 'me'],
    queryFn: () => api.providerMe(),
  });

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['provider', 'zones'] });

  const ajouter = useMutation({
    mutationFn: (slug: string) => api.addProviderZone(slug),
    onSuccess: () => {
      setChoix(null);
      rafraichir();
    },
  });
  const retirer = useMutation({
    mutationFn: (id: string) => api.removeProviderZone(id),
    onSuccess: rafraichir,
  });
  const majRayon = useMutation({
    mutationFn: (km: number) => api.providerUpdate({ serviceRadiusKm: km }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider'] }),
  });

  const rayonAffiche = rayon !== '' ? rayon : String(profil?.serviceRadiusKm ?? '');
  /** Une zone declaree rend le rayon inoperant : autant le dire. */
  const rayonIgnore = (zones?.length ?? 0) > 0;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-display font-semibold mb-3 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-bledi-blue" />
        Mes zones d intervention
      </h2>

      <div className="bg-white rounded-bledi shadow-bledi p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <LocalityPicker
              value={choix?.slug ?? ''}
              onChange={setChoix}
              label="Ajouter une ville"
              placeholder="Choisir une ville desservie"
              id="zone-ville"
            />
          </div>
          <button
            onClick={() => choix && ajouter.mutate(choix.slug)}
            disabled={!choix || ajouter.isPending}
            className="btn-primary flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {ajouter.error && (
          <p className="text-sm text-red-700 bg-red-50 rounded p-2 mt-3">
            {(ajouter.error as Error).message}
          </p>
        )}

        {/* -------------------------------------------- Rayon d intervention */}
        <div className="mt-4 pt-4 border-t border-cloud">
          <label className="text-sm block mb-1" htmlFor="rayon-km">
            Rayon d intervention
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="rayon-km"
              type="number"
              min={1}
              max={500}
              className="input-bledi w-28"
              placeholder="km"
              value={rayonAffiche}
              onChange={(e) => setRayon(e.target.value)}
            />
            <span className="text-sm text-slate">km</span>
            <button
              onClick={() => majRayon.mutate(Number(rayonAffiche))}
              disabled={!rayonAffiche || majRayon.isPending}
              className="border-2 border-bledi-blue text-bledi-blue px-3 py-2 rounded-bledi-sm text-sm font-medium hover:bg-bledi-blue hover:text-white disabled:opacity-50"
            >
              {majRayon.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {majRayon.isSuccess && !majRayon.isPending && (
              <span className="text-sm text-emerald-700">Enregistre</span>
            )}
          </div>
          {/* Dire quand un reglage ne sert plus a rien vaut mieux que de le
              laisser croire actif. */}
          <p className="text-xs text-slate mt-2">
            {rayonIgnore
              ? 'Sans effet tant que vous declarez des villes ci-dessus : ce sont elles qui font foi. Le rayon reprend la main si vous les retirez toutes.'
              : 'Utilise tant qu aucune ville n est declaree. Ajoutez des villes ci-dessus pour dire precisement ce que vous desservez.'}
          </p>
        </div>

        <div className="mt-4">
          {isLoading && <p className="text-sm text-slate">Chargement...</p>}

          {zones && !zones.length && (
            <Empty>
              Aucune zone declaree. Tant que cette liste est vide, vous etes propose selon le rayon
              en kilometres de votre fiche — ce qui vous fait recevoir des demandes trop loin, et en
              rater de proches.
            </Empty>
          )}

          <div className="flex flex-wrap gap-2">
            {zones?.map((z: any) => (
              <span
                key={z.id}
                className="inline-flex items-center gap-2 bg-cream rounded-bledi-sm px-3 py-1.5 text-sm"
              >
                <span className="text-charcoal">{z.city}</span>
                <span className="text-slate text-xs">{z.region}</span>
                <button
                  onClick={() => retirer.mutate(z.id)}
                  disabled={retirer.isPending}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  aria-label={`Retirer ${z.city}`}
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
