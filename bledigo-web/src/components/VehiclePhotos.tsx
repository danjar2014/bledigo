'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import PhotoUploader from './PhotoUploader';

/**
 * Galerie d un vehicule.
 *
 * Meme forme que VehicleCalendar : une fenetre ouverte depuis la fiche, pas un
 * ecran de plus. L agence gere sa flotte au meme endroit.
 *
 * Les photos sont envoyees une par une au serveur des qu elles sont
 * televersees, sans bouton « enregistrer » : une galerie a moitie sauvegardee
 * apres une fermeture accidentelle serait pire qu un aller-retour de plus.
 */
export default function VehiclePhotos({
  vehicle,
  onClose,
}: {
  vehicle: any;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['provider'] });

  const ajouter = useMutation({
    mutationFn: async (file: File) => {
      const url = await api.uploadFile(file, `vehicules/${vehicle.id}`);
      return api.addVehiclePhoto(vehicle.id, url);
    },
    onSuccess: rafraichir,
  });

  const supprimer = useMutation({
    mutationFn: (photoId: string) => api.removeVehiclePhoto(vehicle.id, photoId),
    onSuccess: rafraichir,
  });

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-bledi w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-charcoal">Photos du vehicule</h2>
            <p className="text-sm text-slate">
              {vehicle.brand} {vehicle.model}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate hover:text-charcoal" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <PhotoUploader
          photos={vehicle.photos ?? []}
          dossier={`vehicules/${vehicle.id}`}
          max={8}
          aide="Exterieur, interieur, coffre, tableau de bord. Une seule photo ne montre rien de ce qu on regarde avant de louer — et la premiere sert de visuel principal."
          onAdd={async (f) => {
            await ajouter.mutateAsync(f);
          }}
          onRemove={(p) => p.id && supprimer.mutate(p.id)}
        />

        {(ajouter.error || supprimer.error) && (
          <p className="text-sm text-red-700 bg-red-50 rounded p-2 mt-3">
            {((ajouter.error || supprimer.error) as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
