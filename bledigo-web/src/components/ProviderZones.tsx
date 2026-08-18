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

  const { data: zones, isLoading } = useQuery({
    queryKey: ['provider', 'zones'],
    queryFn: () => api.providerZones(),
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
