'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, MapPin, Star, Check, Phone } from 'lucide-react';
import { notable, maNote } from '@/lib/prestations';
import ServiceReviewModal from './ServiceReviewModal';
import { api } from '@/lib/api';
import { Empty } from './ui';
import { date, heure } from '@/lib/format';
import PriceNegotiation from './PriceNegotiation';

/**
 * Menage et entretien, cote hote.
 *
 * Sans cet ecran, une societe de menage pouvait etre creee et se connecter sans
 * jamais recevoir la moindre demande : rien n appelait l annuaire. C etait la
 * moitie « creation d emploi » du projet, restee inerte.
 *
 * La plateforme n encaisse toujours rien, mais le tarif se convient DESORMAIS
 * ici plutot qu au telephone apres coup. Un prestataire qui accepte sans
 * connaitre le montant, le quartier ni l heure accepte sans savoir quoi — et
 * decouvre ensuite qu il traverse la ville pour un prix qu il aurait refuse.
 */
export default function CleaningServices({ listings }: { listings: any[] }) {
  const queryClient = useQueryClient();
  const [logementId, setLogementId] = useState<string>(listings[0]?.id ?? '');
  const [quand, setQuand] = useState<string>('');
  // Un creneau, pas une journee : sans heure, le prestataire doit rappeler pour
  // savoir quand venir, et la demande ne lui apprend rien d actionnable.
  const [debut, setDebut] = useState<string>('10:00');
  const [fin, setFin] = useState<string>('12:00');
  const [quartier, setQuartier] = useState<string>('');
  const [acces, setAcces] = useState<string>('');
  const [tarif, setTarif] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [aNoter, setANoter] = useState<any>(null);

  const logement = listings.find((l: any) => l.id === logementId);

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
      api.requestCleaning(logementId, {
        providerId,
        // Les heures partent avec la date : le serveur range le creneau dans
        // startDate et endDate, qui portent deja l heure.
        startDate: `${quand}T${debut}:00`,
        endDate: `${quand}T${fin}:00`,
        district: quartier || undefined,
        addressHint: acces || undefined,
        proposedPrice: tarif ? Number(tarif) : undefined,
        note: note || undefined,
      }),
    onSuccess: () => {
      setNote('');
      setAcces('');
      setTarif('');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  const creneauValide = quand && fin > debut;

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
          <div className="text-sm">
            <span className="block mb-1">Creneau</span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                aria-label="Heure de debut"
                className="input-bledi w-full"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
              />
              <span className="text-slate">a</span>
              <input
                type="time"
                aria-label="Heure de fin"
                className="input-bledi w-full"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <label className="text-sm">
            Quartier
            {/* La ville et le gouvernorat viennent du logement, cote serveur :
                les laisser saisir permettrait d annoncer une zone qui n est pas
                celle du bien, et de faire deplacer quelqu un pour rien. */}
            <input
              className="input-bledi w-full mt-1"
              placeholder={logement?.city ? `a ${logement.city}` : 'Ex. Marsa Plage'}
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
            />
            {logement?.city && (
              <span className="text-xs text-slate">
                {logement.city}
                {logement.region ? `, ${logement.region}` : ''} — repris de l annonce
              </span>
            )}
          </label>
          <label className="text-sm">
            Tarif propose ({logement?.currency || 'TND'})
            <input
              type="number"
              min={0}
              className="input-bledi w-full mt-1"
              placeholder="laisser vide pour laisser chiffrer"
              value={tarif}
              onChange={(e) => setTarif(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Acces
            <input
              className="input-bledi w-full mt-1"
              placeholder="2e etage, code 1234, cles chez le gardien..."
              value={acces}
              onChange={(e) => setAcces(e.target.value)}
            />
          </label>
        </div>

        <label className="text-sm block mt-3">
          Precision
          <input
            className="input-bledi w-full mt-1"
            placeholder="Apres depart, 4 chambres..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

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
                  disabled={!creneauValide || demander.isPending}
                  className="text-sm bg-bledi-blue text-white px-3 py-1.5 rounded-bledi-sm font-medium hover:opacity-90 disabled:opacity-50"
                  title={
                    !quand
                      ? 'Choisissez une date d intervention'
                      : fin <= debut
                        ? 'La fin du creneau doit suivre son debut'
                        : undefined
                  }
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
                  Intervention du {date(c.startDate)} de {heure(c.startDate)} a {heure(c.endDate)}
                  {c.district ? ` · ${c.district}` : ''}
                  {c.note ? ` — « ${c.note} »` : ''}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-bledi-sm bg-cloud">{c.status}</span>
                  {notable(c, 'client') && (
                    <button
                      onClick={() => setANoter(c)}
                      className="text-xs flex items-center gap-1 bg-bledi-gold text-charcoal px-2 py-1 rounded-bledi-sm font-medium"
                    >
                      <Star className="w-3 h-3" /> Noter
                    </button>
                  )}
                  {maNote(c, 'client') != null && (
                    <span className="text-xs flex items-center gap-1 text-slate">
                      <Star className="w-3 h-3 text-bledi-gold fill-bledi-gold" />
                      {maNote(c, 'client')}/5 donne
                    </span>
                  )}
                </div>
              </div>
              {/* Le tarif se discute AVANT l acceptation : une fois acceptee,
                  la demande est figee au montant retenu. */}
              <PriceNegotiation demande={c} role="client" />

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

      {aNoter && (
        <ServiceReviewModal prestation={aNoter} role="client" onClose={() => setANoter(null)} />
      )}
    </section>
  );
}
