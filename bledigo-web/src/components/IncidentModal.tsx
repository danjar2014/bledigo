'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, ShieldAlert, Scale } from 'lucide-react';
import { api } from '@/lib/api';
import { date } from '@/lib/format';
import PhotoUploader from './PhotoUploader';

/**
 * Sinistres au retour d un vehicule.
 *
 * Une seule fenetre pour les deux camps, le role decidant de ce qu on peut y
 * faire : l agence declare, le client conteste. Les deux voient la MEME liste,
 * ce qui n est pas un detail — un dispositif ou chacun verrait sa version
 * n opposerait rien du tout.
 *
 * Ce que cette fenetre ne fait pas, et le dit : elle ne sanctionne personne.
 * Une agence qui declare un dommage recupere une caution, c est exactement le
 * genre d interet qui interdit de la croire sur parole. Le projet a deja
 * tranche ce point pour les absences a l arrivee.
 */

const TYPES = [
  { code: 'rayure', label: 'Rayure' },
  { code: 'choc', label: 'Choc ou enfoncement' },
  { code: 'mecanique', label: 'Panne mecanique' },
  { code: 'carburant', label: 'Carburant manquant' },
  { code: 'proprete', label: 'Etat de proprete' },
  { code: 'retard', label: 'Retard de restitution' },
  { code: 'autre', label: 'Autre' },
];

const RESOLUTIONS: Record<string, { label: string; className: string }> = {
  etabli: { label: 'Etabli', className: 'bg-amber-100 text-amber-900' },
  conteste: { label: 'Conteste', className: 'bg-red-100 text-red-900' },
  abandonne: { label: 'Retire par l agence', className: 'bg-cloud text-slate' },
};

export default function IncidentModal({
  prestation,
  role,
  onClose,
}: {
  prestation: any;
  role: 'client' | 'prestataire';
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('rayure');
  const [description, setDescription] = useState('');
  const [cout, setCout] = useState('');
  const [photos, setPhotos] = useState<{ url: string }[]>([]);
  const [conteste, setConteste] = useState<string | null>(null);
  const [motif, setMotif] = useState('');

  const { data: sinistres, refetch } = useQuery({
    queryKey: ['incidents', prestation.id],
    queryFn: () => api.serviceIncidents(prestation.id),
  });

  const rafraichir = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['provider'] });
    queryClient.invalidateQueries({ queryKey: ['service-orders'] });
  };

  const declarer = useMutation({
    mutationFn: () =>
      api.declareIncident(prestation.id, {
        type,
        description,
        estimatedCost: cout ? Number(cout) : undefined,
        photos: photos.map((p) => p.url),
      }),
    onSuccess: () => {
      setDescription('');
      setCout('');
      setPhotos([]);
      rafraichir();
    },
  });

  const contester = useMutation({
    mutationFn: (id: string) => api.contestIncident(id, motif),
    onSuccess: () => {
      setConteste(null);
      setMotif('');
      rafraichir();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-bledi w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-charcoal">Etat du vehicule</h2>
            <p className="text-sm text-slate">
              {prestation.vehicle
                ? `${prestation.vehicle.brand} ${prestation.vehicle.model}`
                : 'Location'}{' '}
              — retour le {date(prestation.endDate)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate hover:text-charcoal" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- Ce qui a deja ete declare, vu par les deux camps --- */}
        {sinistres && sinistres.length > 0 && (
          <div className="space-y-2 mb-4">
            {sinistres.map((s: any) => {
              const etat = RESOLUTIONS[s.resolution] ?? RESOLUTIONS.etabli;
              return (
                <div key={s.id} className="border border-cloud rounded-bledi-sm p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-charcoal">
                      {TYPES.find((t) => t.code === s.type)?.label ?? s.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${etat.className}`}>
                      {etat.label}
                    </span>
                  </div>
                  <p className="text-charcoal mt-1">{s.description}</p>
                  {s.estimatedCost != null && (
                    <p className="text-slate text-xs mt-1">
                      Cout estime : {s.estimatedCost} {prestation.currency}
                    </p>
                  )}
                  {s.contestReason && (
                    <p className="text-red-800 bg-red-50 rounded p-2 mt-2 text-xs">
                      Contestation du client : « {s.contestReason} »
                    </p>
                  )}

                  {role === 'client' && !s.contestedAt && s.resolution !== 'abandonne' && (
                    <div className="mt-2">
                      {conteste === s.id ? (
                        <div className="space-y-2">
                          <textarea
                            className="input-bledi h-20 text-sm"
                            value={motif}
                            onChange={(e) => setMotif(e.target.value)}
                            placeholder="Expliquez ce que vous contestez, precisement..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => contester.mutate(s.id)}
                              disabled={motif.trim().length < 20 || contester.isPending}
                              className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-bledi-sm font-medium disabled:opacity-50"
                            >
                              {contester.isPending ? 'Envoi...' : 'Contester'}
                            </button>
                            <button
                              onClick={() => setConteste(null)}
                              className="text-sm border border-cloud px-3 py-1.5 rounded-bledi-sm text-slate"
                            >
                              Annuler
                            </button>
                          </div>
                          {motif.trim().length > 0 && motif.trim().length < 20 && (
                            <p className="text-xs text-slate">
                              Encore {20 - motif.trim().length} caractere(s).
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setConteste(s.id)}
                          className="text-sm flex items-center gap-1.5 border border-red-300 text-red-700 px-3 py-1.5 rounded-bledi-sm font-medium hover:bg-red-50"
                        >
                          <Scale className="w-4 h-4" />
                          Je conteste
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* --- Declaration, reservee a l agence --- */}
        {role === 'prestataire' ? (
          <div className="border-t border-cloud pt-4">
            <p className="font-medium text-charcoal mb-3">Declarer un sinistre</p>

            <label className="block text-sm font-medium mb-1">Nature</label>
            <select className="input-bledi mb-3" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium mb-1">Ce que vous avez constate</label>
            <textarea
              className="input-bledi h-24 mb-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rayure profonde sur la portiere avant droite, absente au depart..."
            />
            <p className="text-xs text-slate mb-3">
              {description.trim().length < 20
                ? `Encore ${20 - description.trim().length} caractere(s).`
                : 'Ce texte sera transmis au client et servira de piece en cas de contestation.'}
            </p>

            <label className="block text-sm font-medium mb-1">Cout estime (optionnel)</label>
            <input
              type="number"
              min={0}
              className="input-bledi mb-3 w-40"
              value={cout}
              onChange={(e) => setCout(e.target.value)}
            />

            <label className="block text-sm font-medium mb-1">Photos du dommage</label>
            <PhotoUploader
              photos={photos}
              dossier="sinistres"
              max={6}
              aide="La preuve vaut mieux que l assertion : sans photo, une contestation vous laissera sans piece."
              onAdd={async (f) => {
                const url = await api.uploadFile(f, 'sinistres');
                setPhotos((p) => [...p, { url }]);
              }}
              onRemove={(p) => setPhotos((ps) => ps.filter((x) => x.url !== p.url))}
            />

            {declarer.error && (
              <p className="text-sm text-red-700 bg-red-50 rounded p-2 mt-3">
                {(declarer.error as Error).message}
              </p>
            )}

            <button
              onClick={() => declarer.mutate()}
              disabled={description.trim().length < 20 || declarer.isPending}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-bledi-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              <ShieldAlert className="w-5 h-5" />
              {declarer.isPending ? 'Envoi...' : 'Declarer'}
            </button>

            <p className="text-xs text-slate mt-3">
              Declarable dans les 7 jours suivant la restitution. Le client sera informe et pourra
              contester : une declaration contestee ne sanctionne personne, c est l administration
              qui tranche.
            </p>
          </div>
        ) : (
          !sinistres?.length && (
            <p className="text-sm text-slate">Aucun sinistre declare sur cette location.</p>
          )
        )}
      </div>
    </div>
  );
}
