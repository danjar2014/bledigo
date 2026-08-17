'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Star, Phone, X, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { date } from '@/lib/format';
import { notable, maNote } from '@/lib/prestations';
import ServiceReviewModal from './ServiceReviewModal';
import IncidentModal from './IncidentModal';

/**
 * Locations de voiture du voyageur.
 *
 * Elles n avaient nulle part ou vivre : on pouvait demander une voiture depuis
 * une reservation, puis ne plus jamais revoir la demande. Sans cette liste, ni
 * les coordonnees de l agence ni la notation n etaient atteignables.
 */
export default function ServiceOrders() {
  const queryClient = useQueryClient();
  const [aNoter, setANoter] = useState<any>(null);
  const [sinistresDe, setSinistresDe] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ['service-orders'],
    queryFn: () => api.myServiceOrders(),
  });

  const annuler = useMutation({
    mutationFn: (id: string) => api.cancelServiceOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-orders'] }),
  });

  const locations = (data || []).filter((c: any) => c.type === 'location_voiture');
  if (!locations.length) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display font-semibold text-xl text-charcoal mb-3 flex items-center gap-2">
        <Car className="w-5 h-5 text-bledi-blue" />
        Mes locations de voiture
      </h2>

      <div className="space-y-3">
        {locations.map((c: any) => {
          const note = maNote(c, 'client');
          return (
            <div key={c.id} className="bg-white rounded-bledi shadow-bledi p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-charcoal">
                    {c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model}` : 'Vehicule'}
                  </p>
                  <p className="text-sm text-slate">
                    du {date(c.startDate)} au {date(c.endDate)} · {c.price} {c.currency}
                  </p>
                  {c.note && <p className="text-sm text-charcoal mt-1">« {c.note} »</p>}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-bledi-sm bg-cloud">{c.status}</span>
                  {c.status === 'pending' && (
                    <button
                      onClick={() => annuler.mutate(c.id)}
                      className="text-xs flex items-center gap-1 border border-cloud px-2 py-1 rounded-bledi-sm hover:bg-cream"
                    >
                      <X className="w-3 h-3" /> Annuler
                    </button>
                  )}
                  {notable(c, 'client') && (
                    <button
                      onClick={() => setANoter(c)}
                      className="text-xs flex items-center gap-1 bg-bledi-gold text-charcoal px-2 py-1 rounded-bledi-sm font-medium"
                    >
                      <Star className="w-3 h-3" /> Noter l agence
                    </button>
                  )}
                  {note != null && (
                    <span className="text-xs flex items-center gap-1 text-slate">
                      <Star className="w-3 h-3 text-bledi-gold fill-bledi-gold" />
                      {note}/5 donne
                    </span>
                  )}
                  {/* Une declaration de sinistre serait sans valeur si le
                      voyageur ne pouvait pas la voir ni la contredire : le
                      bouton reste accessible une fois le vehicule rendu, meme
                      quand rien n a ete declare. */}
                  {new Date(c.endDate) <= new Date() && c.status !== 'cancelled' && (
                    <button
                      onClick={() => setSinistresDe(c)}
                      className="text-xs flex items-center gap-1 border border-cloud px-2 py-1 rounded-bledi-sm hover:bg-cream"
                    >
                      <ShieldAlert className="w-3 h-3" /> Etat du vehicule
                    </button>
                  )}
                </div>
              </div>

              {c.contact && (
                <div className="mt-3 p-3 rounded-bledi-sm bg-emerald-50 border border-emerald-200 text-sm">
                  <p className="font-medium text-emerald-900">{c.contact.nom}</p>
                  {c.contact.telephone && (
                    <a href={`tel:${c.contact.telephone}`} className="underline font-medium">
                      <Phone className="w-3 h-3 inline mr-1" />
                      {c.contact.telephone}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {aNoter && (
        <ServiceReviewModal prestation={aNoter} role="client" onClose={() => setANoter(null)} />
      )}
      {sinistresDe && (
        <IncidentModal
          prestation={sinistresDe}
          role="client"
          onClose={() => setSinistresDe(null)}
        />
      )}
    </section>
  );
}
