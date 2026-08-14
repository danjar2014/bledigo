'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Check, MapPin, Star } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * Vehicules proposes au voyageur, une fois son sejour accepte.
 *
 * Le bloc ne s ouvre qu a la demande : interroger l API pour chaque
 * reservation affichee ferait autant de requetes que de lignes, pour une offre
 * que la plupart des voyageurs ne regarderont pas.
 */
export default function CarOffers({ booking }: { booking: any }) {
  const [ouvert, setOuvert] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cars', booking.id],
    queryFn: () => api.carsForBooking(booking.id),
    enabled: ouvert,
  });

  const demander = useMutation({
    mutationFn: (vehicleId: string) => api.requestCar(booking.id, { vehicleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="mt-3 flex items-center gap-2 text-sm font-medium text-bledi-blue hover:underline"
      >
        <Car className="w-4 h-4" />
        Louer une voiture pour ce sejour
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-bledi-sm bg-cream border border-cloud">
      <p className="text-sm font-medium text-charcoal mb-2 flex items-center gap-2">
        <Car className="w-4 h-4 text-bledi-blue" />
        Agences autour de {data?.lieu?.ville || 'votre logement'}
      </p>

      {isLoading && <p className="text-sm text-slate">Recherche des disponibilites...</p>}

      {data && !data.disponible && <p className="text-sm text-slate">{data.motif}</p>}

      {data?.disponible && !data.vehicules.length && (
        <p className="text-sm text-slate">
          Aucun vehicule disponible sur ces dates pres de votre logement.
        </p>
      )}

      <div className="space-y-2">
        {data?.vehicules?.map((v: any) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-bledi-sm p-3"
          >
            <div>
              <p className="font-medium text-charcoal">
                {v.brand} {v.model}
              </p>
              <p className="text-xs text-slate">
                {v.category} · {v.transmission} · {v.seats} places
                {v.airConditioned ? ' · clim' : ''}
              </p>
              <p className="text-xs text-slate mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {v.agence.nom}
                  {v.distanceKm != null ? ` · ${v.distanceKm} km` : ''}
                </span>
                {v.agence.avis > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    {v.agence.note} ({v.agence.avis})
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-charcoal">
                {v.tarif.prix} TND
                <span className="text-xs font-normal text-slate"> / {v.tarif.jours} j</span>
              </p>
              <button
                onClick={() => demander.mutate(v.id)}
                disabled={demander.isPending}
                className="mt-1 text-sm bg-bledi-blue text-white px-3 py-1.5 rounded-bledi-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                Demander
              </button>
            </div>
          </div>
        ))}
      </div>

      {demander.isSuccess && (
        <p className="text-sm text-emerald-800 mt-2 flex items-center gap-1">
          <Check className="w-4 h-4" />
          Demande envoyee. L agence vous communiquera ses coordonnees des qu elle l aura acceptee.
        </p>
      )}
      {demander.error ? (
        <p className="text-sm text-red-600 mt-2">{(demander.error as any).message}</p>
      ) : null}
    </div>
  );
}
