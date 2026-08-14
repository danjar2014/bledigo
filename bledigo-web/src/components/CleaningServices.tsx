'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, MapPin, Star, Check, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { Empty } from './ui';
import { date } from '@/lib/format';

/**
 * Menage et entretien, cote hote.
 *
 * Sans cet ecran, une societe de menage pouvait etre creee et se connecter sans
 * jamais recevoir la moindre demande : rien n appelait l annuaire. C etait la
 * moitie « creation d emploi » du projet, restee inerte.
 *
 * Le prix n est pas demande, deliberement : la plateforme n encaisse rien et n a
 * aucune raison d imposer un tarif. Il se convient entre les parties, une fois
 * les coordonnees echangees.
 */
export default function CleaningServices({ listings }: { listings: any[] }) {
  const queryClient = useQueryClient();
  const [logementId, setLogementId] = useState<string>(listings[0]?.id ?? '');
  const [quand, setQuand] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const { data: prestataires, isLoading } = useQuery({
    queryKey: ['cleaners', logementId],
    queryFn: () => api.cleanersNear(logementId),
    enabled: !!logementId,
  });

  const { data: commandes } = useQuery({
    queryKey: ['service-orders'],
    queryFn: () => api.myServiceOrders(),
  });

  const demander = useMutation({
    mutationFn: (providerId: string) =>
      api.requestCleaning(logementId, { providerId, startDate: quand, note: note || undefined }),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  const menages = (commandes || []).filter((c: any) => c.type === 'menage');

  if (!listings.length) return null;

  return (
    <section className="mb-10">
      <h2 className="font-display font-semibold text-xl text-charcoal mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-bledi-gold" />
        Menage et entretien
      </h2>

      <div className="bg-white rounded-bledi shadow-bledi p-4">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm">
            Logement
            <select
              className="input-bledi w-full mt-1"
              value={logementId}
              onChange={(e) => setLogementId(e.target.value)}
            >
              {listings.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Date d intervention
            <input
              type="date"
              className="input-bledi w-full mt-1"
              value={quand}
              onChange={(e) => setQuand(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Precision
            <input
              className="input-bledi w-full mt-1"
              placeholder="Apres depart, 4 chambres..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4">
          {isLoading && <p className="text-sm text-slate">Recherche des prestataires...</p>}

          {prestataires && !prestataires.length && (
            <Empty>
              Aucun prestataire de menage n intervient encore autour de ce logement.
            </Empty>
          )}

          <div className="space-y-2">
            {prestataires?.map((p: any) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-bledi-sm bg-cream p-3"
              >
                <div>
                  <p className="font-medium text-charcoal">{p.companyName}</p>
                  <p className="text-xs text-slate flex items-center gap-3 flex-wrap mt-1">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {p.city || 'zone non precisee'}
                      {p.distanceKm != null ? ` · ${p.distanceKm} km` : ''}
                    </span>
                    {p.totalReviews > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        {p.avgRating} ({p.totalReviews} avis)
                      </span>
                    ) : (
                      <span>nouveau sur BlediGo</span>
                    )}
                    <span>{p.totalJobs} prestation{p.totalJobs > 1 ? 's' : ''}</span>
                  </p>
                </div>
                <button
                  onClick={() => demander.mutate(p.id)}
                  disabled={!quand || demander.isPending}
                  className="text-sm bg-bledi-blue text-white px-3 py-1.5 rounded-bledi-sm font-medium hover:opacity-90 disabled:opacity-50"
                  title={!quand ? 'Choisissez une date d intervention' : undefined}
                >
                  Demander
                </button>
              </div>
            ))}
          </div>

          {demander.isSuccess && (
            <p className="text-sm text-emerald-800 mt-3 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Demande envoyee. Le prestataire vous communiquera ses coordonnees des qu il l aura
              acceptee.
            </p>
          )}
          {demander.error ? (
            <p className="text-sm text-red-600 mt-3">{(demander.error as any).message}</p>
          ) : null}
        </div>
      </div>

      {menages.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-slate">Mes demandes de menage</h3>
          {menages.map((c: any) => (
            <div key={c.id} className="bg-white rounded-bledi-sm shadow-bledi p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  Intervention du {date(c.startDate)}
                  {c.note ? ` — « ${c.note} »` : ''}
                </p>
                <span className="text-xs px-2 py-1 rounded-bledi-sm bg-cloud">{c.status}</span>
              </div>
              {/* Rien avant acceptation : meme regle que pour un sejour. */}
              {c.contact && (
                <p className="text-sm mt-2 text-emerald-900">
                  {c.contact.nom}
                  {c.contact.telephone && (
                    <>
                      {' · '}
                      <a href={`tel:${c.contact.telephone}`} className="underline font-medium">
                        <Phone className="w-3 h-3 inline mr-1" />
                        {c.contact.telephone}
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
