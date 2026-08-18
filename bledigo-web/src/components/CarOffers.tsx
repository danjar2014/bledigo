'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Check, MapPin, Star } from 'lucide-react';
import { api } from '@/lib/api';

/** Carburants, dits en francais plutot qu en code. Le GPL est courant ici. */
const CARBURANTS: Record<string, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  hybride: 'Hybride',
  electrique: 'Electrique',
  gpl: 'GPL',
};

/** Politiques de carburant, dites en francais plutot qu en code. */
const POLITIQUES: Record<string, string> = {
  plein_a_plein: 'rendu avec le plein',
  plein_a_vide: 'plein paye au depart',
  identique: 'rendu au meme niveau',
};

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
            className="flex flex-wrap items-start justify-between gap-3 bg-white rounded-bledi-sm p-3"
          >
            <div className="flex gap-3 flex-1 min-w-[240px]">
              {/* La photo d abord : on ne loue pas une voiture qu on ne voit
                  pas, et une galerie vide se remarque tout de suite. */}
              {v.photos?.length ? (
                <div className="flex gap-1 shrink-0">
                  {v.photos.slice(0, 2).map((p: any) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.url}
                      alt=""
                      className="w-20 h-16 object-cover rounded-bledi-sm bg-cloud"
                    />
                  ))}
                  {v.photos.length > 2 && (
                    <span className="self-end text-[10px] text-slate">+{v.photos.length - 2}</span>
                  )}
                </div>
              ) : (
                <div className="w-20 h-16 rounded-bledi-sm bg-cloud flex items-center justify-center shrink-0">
                  <Car className="w-6 h-6 text-slate/50" />
                </div>
              )}
            <div>
              <p className="font-medium text-charcoal">
                {v.brand} {v.model}
              </p>
              <p className="text-xs text-slate">
                {v.category} · {v.transmission} · {v.seats} places
                {v.doors ? ` · ${v.doors} portes` : ''}
                {v.airConditioned ? ' · clim' : ''}
              </p>
              {/* La fiche technique que tout loueur affiche, et qu on ne
                  pouvait pas saisir : le kilometrage absent est un signal. */}
              <p className="text-xs text-slate">
                {CARBURANTS[v.fuel] ?? v.fuel}
                {v.fiscalPower ? ` · ${v.fiscalPower} CV` : ''}
                {v.year ? ` · ${v.year}` : ''}
                {v.mileage != null ? ` · ${new Intl.NumberFormat('fr-FR').format(v.mileage)} km` : ''}
              </p>

              {/* Les conditions AVANT la demande, jamais au comptoir : une
                  condition decouverte apres coup est inopposable, c est le meme
                  raisonnement que les conditions d annulation d un sejour. */}
              <ul className="text-xs text-slate mt-1 space-y-0.5">
                <li>
                  {v.kmPerDay ? `${v.kmPerDay} km/jour inclus` : 'Kilometrage illimite'}
                  {v.kmPerDay && v.extraKmPrice != null
                    ? `, puis ${v.extraKmPrice} TND/km`
                    : ''}
                </li>
                <li>
                  Age minimum {v.minDriverAge} ans · permis depuis {v.minLicenceYears} an
                  {v.minLicenceYears > 1 ? 's' : ''}
                </li>
                <li>
                  Carburant : {POLITIQUES[v.fuelPolicy] ?? v.fuelPolicy}
                  {v.deposit > 0 ? ` · caution ${v.deposit} TND` : ''}
                </li>
                {v.pickupLocation && (
                  <li>
                    Prise en charge : {v.pickupLocation}
                    {v.returnLocation && v.returnLocation !== v.pickupLocation
                      ? ` · restitution : ${v.returnLocation}`
                      : ''}
                  </li>
                )}
                {v.deliveryAvailable && (
                  <li>
                    Livraison possible{v.deliveryFee > 0 ? ` (${v.deliveryFee} TND)` : ' (offerte)'}
                  </li>
                )}
              </ul>
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
