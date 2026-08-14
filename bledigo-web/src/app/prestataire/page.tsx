'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car, Plus, Trash2, CalendarDays, Check, X, ShieldCheck, ShieldAlert, Star, Phone,
} from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorBox, Empty } from '@/components/ui';
import { date } from '@/lib/format';
import VehicleCalendar from '@/components/VehicleCalendar';

/**
 * Espace du prestataire.
 *
 * Une section de l application, pas une application a part : le compte, la
 * connexion et les roles sont deja en place. Un troisieme service Render
 * aurait ajoute un build, un domaine et une variable NEXT_PUBLIC_ de plus a
 * oublier, sans rien resoudre.
 */
function EspacePrestataire() {
  const queryClient = useQueryClient();
  const [calendrierDe, setCalendrierDe] = useState<any>(null);

  const { data: profil, isLoading, error } = useQuery({
    queryKey: ['provider', 'me'],
    queryFn: () => api.providerMe(),
  });

  const estLoueur = profil?.type === 'location_voiture';

  const { data: flotte } = useQuery({
    queryKey: ['provider', 'fleet'],
    queryFn: () => api.providerFleet(),
    enabled: !!profil && estLoueur,
  });

  const { data: demandes } = useQuery({
    queryKey: ['provider', 'requests'],
    queryFn: () => api.providerRequests(),
    enabled: !!profil,
  });

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ['provider'] });
  };

  const accepter = useMutation({ mutationFn: (id: string) => api.providerAccept(id), onSuccess: rafraichir });
  const refuser = useMutation({ mutationFn: (id: string) => api.providerRefuse(id), onSuccess: rafraichir });
  const retirer = useMutation({
    mutationFn: (id: string) => api.providerRemoveVehicle(id),
    onSuccess: rafraichir,
  });

  const ajouter = useMutation({
    mutationFn: (dto: any) => api.providerAddVehicle(dto),
    onSuccess: rafraichir,
  });

  if (isLoading) return <Spinner />;
  if (error) return <main className="container mx-auto px-4 py-10"><ErrorBox error={error} /></main>;

  const enAttente = profil.status === 'pending';
  const suspendu = profil.status === 'suspended';

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">{profil.companyName}</h1>
            <p className="text-slate mt-1">
              {estLoueur ? 'Agence de location de vehicules' : 'Menage et entretien'}
              {profil.city ? ` · ${profil.city}` : ''}
              {profil.serviceRadiusKm ? ` · rayon ${profil.serviceRadiusKm} km` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="font-semibold">
                  {profil.totalReviews ? profil.avgRating : '—'}
                </span>
              </div>
              <p className="text-xs text-slate">
                {profil.totalReviews} avis · {profil.totalJobs} prestation
                {profil.totalJobs > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-bledi-blue">{profil.trustScore}</div>
              <p className="text-xs text-slate">score de confiance</p>
            </div>
          </div>
        </div>

        {/* Le compte existe mais n est pas encore constate : le dire franchement
            vaut mieux qu un formulaire qui echoue a l enregistrement. */}
        {enAttente && (
          <div className="mb-6 p-4 rounded-bledi bg-amber-50 border border-amber-200 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Compte en attente de verification</p>
              <p className="text-sm text-amber-800/90 mt-1">
                Votre statut d agence doit etre constate par BlediGo avant que vous puissiez
                publier des vehicules. Vous pouvez deja consulter votre espace.
              </p>
            </div>
          </div>
        )}
        {suspendu && (
          <div className="mb-6 p-4 rounded-bledi bg-red-50 border border-red-200">
            <p className="font-medium text-red-900">Compte suspendu</p>
          </div>
        )}
        {profil.status === 'active' && (
          <div className="mb-6 p-3 rounded-bledi-sm bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-900">
            <ShieldCheck className="w-4 h-4" />
            Statut d agence verifie le {date(profil.verifiedAt)}
          </div>
        )}

        {/* ------------------------------------------------------ Demandes */}
        <section className="mb-10">
          <h2 className="text-xl font-display font-semibold mb-3">Demandes recues</h2>
          {!demandes?.length ? (
            <Empty>Aucune demande pour le moment.</Empty>
          ) : (
            <div className="space-y-3">
              {demandes.map((d: any) => (
                <div key={d.id} className="bg-white rounded-bledi shadow-bledi p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-charcoal">
                        {d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model}` : 'Prestation de menage'}
                      </p>
                      <p className="text-sm text-slate">
                        du {date(d.startDate)} au {date(d.endDate)}
                        {d.price ? ` · ${d.price} ${d.currency}` : ''}
                      </p>
                      {d.note && <p className="text-sm text-charcoal mt-1">« {d.note} »</p>}
                    </div>
                    {d.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => accepter.mutate(d.id)}
                          disabled={accepter.isPending}
                          className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-bledi-sm text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <Check className="w-4 h-4" /> Accepter
                        </button>
                        <button
                          onClick={() => refuser.mutate(d.id)}
                          disabled={refuser.isPending}
                          className="flex items-center gap-1 border-2 border-slate text-slate px-3 py-2 rounded-bledi-sm text-sm font-medium hover:bg-cloud disabled:opacity-60"
                        >
                          <X className="w-4 h-4" /> Refuser
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm px-2 py-1 rounded-bledi-sm bg-cloud">{d.status}</span>
                    )}
                  </div>

                  {/* Les coordonnees n arrivent qu apres acceptation : avant, il
                      n y a rien a afficher, et ce n est pas un oubli. */}
                  {d.contact ? (
                    <div className="mt-3 p-3 rounded-bledi-sm bg-emerald-50 border border-emerald-200 text-sm">
                      <p className="font-medium text-emerald-900">{d.contact.nom}</p>
                      {d.contact.telephone && (
                        <a href={`tel:${d.contact.telephone}`} className="underline font-medium">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {d.contact.telephone}
                        </a>
                      )}
                    </div>
                  ) : (
                    d.status === 'pending' && (
                      <p className="text-xs text-slate mt-2">
                        Les coordonnees du client vous seront communiquees des l acceptation.
                      </p>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* -------------------------------------------------------- Flotte */}
        {estLoueur && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-display font-semibold">Ma flotte</h2>
            </div>

            <FormulaireVehicule
              disabled={enAttente || suspendu}
              onSubmit={(dto) => ajouter.mutate(dto)}
              pending={ajouter.isPending}
              erreur={(ajouter.error as any)?.message}
            />

            {!flotte?.length ? (
              <Empty>Aucun vehicule enregistre.</Empty>
            ) : (
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                {flotte.map((v: any) => (
                  <div key={v.id} className="bg-white rounded-bledi shadow-bledi p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-charcoal flex items-center gap-2">
                          <Car className="w-4 h-4 text-bledi-blue" />
                          {v.brand} {v.model} {v.year ? `(${v.year})` : ''}
                        </p>
                        <p className="text-sm text-slate mt-1">
                          {v.category} · {v.transmission} · {v.seats} places
                          {v.airConditioned ? ' · clim' : ''}
                        </p>
                        <p className="text-sm font-medium mt-1">{v.pricePerDay} TND / jour</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setCalendrierDe(v)}
                          className="flex items-center gap-1 text-sm border-2 border-bledi-blue text-bledi-blue px-2 py-1 rounded-bledi-sm hover:bg-bledi-blue hover:text-white"
                        >
                          <CalendarDays className="w-4 h-4" /> Calendrier
                        </button>
                        <button
                          onClick={() => retirer.mutate(v.id)}
                          className="flex items-center gap-1 text-sm text-red-600 px-2 py-1 rounded-bledi-sm hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" /> Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {calendrierDe && (
        <VehicleCalendar vehicle={calendrierDe} onClose={() => setCalendrierDe(null)} />
      )}
    </main>
  );
}

function FormulaireVehicule({
  disabled,
  pending,
  erreur,
  onSubmit,
}: {
  disabled: boolean;
  pending: boolean;
  erreur?: string;
  onSubmit: (dto: any) => void;
}) {
  const [form, setForm] = useState({
    brand: '',
    model: '',
    pricePerDay: '',
    category: 'citadine',
    transmission: 'manuelle',
    seats: '5',
  });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const complet = form.brand && form.model && form.pricePerDay;

  return (
    <div className="bg-white rounded-bledi shadow-bledi p-4">
      <div className="grid md:grid-cols-6 gap-3">
        <input
          className="input-bledi md:col-span-1"
          placeholder="Marque"
          value={form.brand}
          onChange={(e) => set({ brand: e.target.value })}
        />
        <input
          className="input-bledi md:col-span-1"
          placeholder="Modele"
          value={form.model}
          onChange={(e) => set({ model: e.target.value })}
        />
        <select
          className="input-bledi md:col-span-1"
          value={form.category}
          onChange={(e) => set({ category: e.target.value })}
        >
          {['citadine', 'berline', 'suv', 'utilitaire', 'luxe'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="input-bledi md:col-span-1"
          value={form.transmission}
          onChange={(e) => set({ transmission: e.target.value })}
        >
          <option value="manuelle">manuelle</option>
          <option value="automatique">automatique</option>
        </select>
        <input
          className="input-bledi md:col-span-1"
          type="number"
          placeholder="TND / jour"
          value={form.pricePerDay}
          onChange={(e) => set({ pricePerDay: e.target.value })}
        />
        <button
          disabled={disabled || pending || !complet}
          onClick={() =>
            onSubmit({
              brand: form.brand,
              model: form.model,
              category: form.category,
              transmission: form.transmission,
              seats: Number(form.seats),
              pricePerDay: Number(form.pricePerDay),
            })
          }
          className="btn-primary md:col-span-1 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>
      {disabled && (
        <p className="text-xs text-slate mt-2">
          L ajout de vehicules sera possible une fois votre statut d agence verifie.
        </p>
      )}
      {erreur && <p className="text-sm text-red-600 mt-2">{erreur}</p>}
    </div>
  );
}

export default function Page() {
  // `provider` n est pas activable par l utilisateur : RequireAuth affichera un
  // refus explicite, et c est voulu — le compte se cree par l administration.
  return (
    <RequireAuth roles={['provider']}>
      <EspacePrestataire />
    </RequireAuth>
  );
}
