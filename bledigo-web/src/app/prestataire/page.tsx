'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car, Plus, Trash2, CalendarDays, Check, X, ShieldCheck, ShieldAlert, Star, Phone, MapPin, Images,
} from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorBox, Empty } from '@/components/ui';
import { date, heure } from '@/lib/format';
import VehicleCalendar from '@/components/VehicleCalendar';
import VehiclePhotos from '@/components/VehiclePhotos';
import ProviderZones from '@/components/ProviderZones';
import ProviderAvailability from '@/components/ProviderAvailability';
import ServiceReviewModal from '@/components/ServiceReviewModal';
import ClientProfile from '@/components/ClientProfile';
import PriceNegotiation from '@/components/PriceNegotiation';
import IncidentModal from '@/components/IncidentModal';
import { notable, maNote } from '@/lib/prestations';

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
  const [photosDe, setPhotosDe] = useState<any>(null);
  const [aNoter, setANoter] = useState<any>(null);
  const [sinistreDe, setSinistreDe] = useState<any>(null);

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

        {/* Zones et horaires AVANT les demandes : ils gouvernent ce qui
            arrive dans la liste. Les placer apres laisserait croire que le
            prestataire ne peut que subir ce qu on lui envoie. */}
        <ProviderZones />
        {/* Les horaires ne filtrent aujourd hui que le menage. Les montrer a
            une agence de location serait promettre un filtre qui n existe
            pas : sa disponibilite se gere vehicule par vehicule, dans le
            calendrier de chacun. */}
        {!estLoueur && <ProviderAvailability />}

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
                      {/* Un menage tient dans la journee : afficher « du X au X »
                          se lit comme une erreur de saisie. */}
                      <p className="text-sm text-slate">
                        {date(d.startDate) === date(d.endDate)
                          ? `le ${date(d.startDate)}`
                          : `du ${date(d.startDate)} au ${date(d.endDate)}`}
                        {/* Le creneau ne concerne QUE le menage. Une location
                            court sur des journees entieres : afficher ses
                            heures revient a montrer des minuits UTC convertis,
                            soit « 02:00–02:00 », qui se lit comme un bogue. */}
                        {d.type === 'menage' && ` · ${heure(d.startDate)}–${heure(d.endDate)}`}
                        {d.price ? ` · ${d.price} ${d.currency}` : ''}
                      </p>
                      {/* Ou intervenir. Le prestataire decidait sans le savoir :
                          il ne pouvait ni juger du trajet, ni de son tarif. */}
                      {(d.city || d.district) && (
                        <p className="text-sm text-slate flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {[d.district, d.city, d.region].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {d.addressHint && (
                        <p className="text-xs text-slate mt-0.5">{d.addressHint}</p>
                      )}
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-bledi-sm bg-cloud">{d.status}</span>
                        {/* Le prestataire note son client : un hote qui laisse un
                            logement impraticable doit etre visible, sinon seuls
                            les prestataires portent le risque de la relation. */}
                        {notable(d, 'prestataire') && (
                          <button
                            onClick={() => setANoter(d)}
                            className="text-sm flex items-center gap-1 bg-bledi-gold text-charcoal px-3 py-2 rounded-bledi-sm font-medium"
                          >
                            <Star className="w-4 h-4" /> Noter le client
                          </button>
                        )}
                        {maNote(d, 'prestataire') != null && (
                          <span className="text-sm flex items-center gap-1 text-slate">
                            <Star className="w-4 h-4 text-bledi-gold fill-bledi-gold" />
                            {maNote(d, 'prestataire')}/5 donne
                          </span>
                        )}
                        {/* L etat du vehicule se constate au RETOUR : proposer
                            de declarer avant la restitution n aurait aucun sens,
                            le serveur refuserait de toute facon. */}
                        {d.vehicle && new Date(d.endDate) <= new Date() && (
                          <button
                            onClick={() => setSinistreDe(d)}
                            className="text-sm flex items-center gap-1 border-2 border-amber-600 text-amber-700 px-3 py-2 rounded-bledi-sm font-medium hover:bg-amber-50"
                          >
                            <ShieldAlert className="w-4 h-4" /> Etat du vehicule
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Le tarif se convient AVANT d accepter : accepter d abord et
                      discuter ensuite, c est accepter sans savoir quoi. */}
                  <PriceNegotiation demande={d} role="prestataire" />

                  {/* Savoir a qui l on confie une voiture ou des cles, au moment
                      ou l on decide et pas apres. */}
                  {d.status === 'pending' && <ClientProfile demandeId={d.id} />}

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
                      <div className="flex gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={v.photos?.[0]?.url ?? '/placeholder-vehicule.svg'}
                          alt=""
                          className="w-24 h-18 object-cover rounded-bledi-sm bg-cloud shrink-0"
                          style={{ height: '4.5rem' }}
                        />
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
                          {/* Une flotte sans photos ne se loue pas : le dire ici
                              vaut mieux que de laisser l agence le decouvrir
                              faute de demandes. */}
                          {!v.photos?.length && (
                            <p className="text-xs text-amber-700 mt-1">
                              Aucune photo — les voyageurs ne verront pas ce vehicule tel qu il est.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setPhotosDe(v)}
                          className="flex items-center gap-1 text-sm border-2 border-bledi-blue text-bledi-blue px-2 py-1 rounded-bledi-sm hover:bg-bledi-blue hover:text-white"
                        >
                          <Images className="w-4 h-4" /> Photos
                        </button>
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
      {photosDe && (
        <VehiclePhotos
          vehicle={flotte?.find((v: any) => v.id === photosDe.id) ?? photosDe}
          onClose={() => setPhotosDe(null)}
        />
      )}
      {sinistreDe && (
        <IncidentModal
          prestation={sinistreDe}
          role="prestataire"
          onClose={() => setSinistreDe(null)}
        />
      )}
      {aNoter && (
        <ServiceReviewModal
          prestation={aNoter}
          role="prestataire"
          onClose={() => setANoter(null)}
        />
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
    fuel: 'essence',
    fiscalPower: '',
    mileage: '',
    doors: '5',
    color: '',
    year: '',
    // Conditions de location. Elles ont des valeurs par defaut plausibles
    // plutot que d etre vides : une agence qui ajoute un vehicule a la hate ne
    // doit pas publier une fiche muette sur ce qui l engage.
    kmPerDay: '',
    extraKmPrice: '',
    minDriverAge: '21',
    minLicenceYears: '2',
    fuelPolicy: 'plein_a_plein',
    deposit: '',
    pickupLocation: '',
    deliveryAvailable: false,
    deliveryFee: '',
  });
  const [conditionsOuvertes, setConditionsOuvertes] = useState(false);

  /**
   * Catalogue marques/modeles.
   *
   * Embarque cote serveur plutot qu appele a une API tierce : NHTSA, la seule
   * gratuite et sans cle, couvre le marche americain — interrogee sur Renault
   * elle rend LeCar, Fuego et Alliance, et aucun modele qui roule en Tunisie.
   * Verifie, pas suppose.
   *
   * La liste SUGGERE sans interdire : les champs restent libres, une agence qui
   * loue un modele absent doit pouvoir le saisir sans attendre une mise a jour.
   */
  const { data: catalogue } = useQuery({
    queryKey: ['catalogue-vehicules'],
    queryFn: () => api.vehicleCatalog(),
  });
  const modeles = catalogue?.find((m) => m.marque === form.brand)?.modeles ?? [];
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const complet = form.brand && form.model && form.pricePerDay;

  const dto = () => ({
    brand: form.brand,
    model: form.model,
    category: form.category,
    transmission: form.transmission,
    seats: Number(form.seats),
    pricePerDay: Number(form.pricePerDay),
    fuel: form.fuel,
    year: form.year ? Number(form.year) : undefined,
    fiscalPower: form.fiscalPower ? Number(form.fiscalPower) : undefined,
    mileage: form.mileage ? Number(form.mileage) : undefined,
    doors: form.doors ? Number(form.doors) : undefined,
    color: form.color || undefined,
    // Vide = illimite, jamais 0 : un forfait de zero kilometre interdirait de
    // rouler, ce que personne ne veut dire en laissant le champ vide.
    kmPerDay: form.kmPerDay ? Number(form.kmPerDay) : undefined,
    extraKmPrice: form.extraKmPrice ? Number(form.extraKmPrice) : undefined,
    minDriverAge: Number(form.minDriverAge),
    minLicenceYears: Number(form.minLicenceYears),
    fuelPolicy: form.fuelPolicy,
    deposit: form.deposit ? Number(form.deposit) : undefined,
    pickupLocation: form.pickupLocation || undefined,
    deliveryAvailable: form.deliveryAvailable,
    deliveryFee: form.deliveryFee ? Number(form.deliveryFee) : undefined,
  });

  return (
    <div className="bg-white rounded-bledi shadow-bledi p-4">
      <div className="grid md:grid-cols-6 gap-3">
        {/* `list` plutot qu un `select` : le catalogue suggere, il n interdit
            pas. Une agence qui loue un modele absent le tape. */}
        <input
          className="input-bledi md:col-span-1"
          placeholder="Marque"
          list="marques-vehicules"
          value={form.brand}
          onChange={(e) => set({ brand: e.target.value, model: '' })}
        />
        <datalist id="marques-vehicules">
          {catalogue?.map((m) => (
            <option key={m.marque} value={m.marque} />
          ))}
        </datalist>
        <input
          className="input-bledi md:col-span-1"
          placeholder="Modele"
          list="modeles-vehicules"
          value={form.model}
          onChange={(e) => set({ model: e.target.value })}
        />
        <datalist id="modeles-vehicules">
          {modeles.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
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
          onClick={() => onSubmit(dto())}
          className="btn-primary md:col-span-1 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Repliees par defaut : elles ont toutes une valeur plausible, et
          imposer dix champs a chaque ajout ferait renoncer avant la fin. */}
      <button
        onClick={() => setConditionsOuvertes((o) => !o)}
        className="mt-3 text-sm font-medium text-bledi-blue hover:opacity-80"
        aria-expanded={conditionsOuvertes}
      >
        {conditionsOuvertes ? 'Masquer' : 'Preciser'} les conditions de location
      </button>

      {conditionsOuvertes && (
        <div className="grid md:grid-cols-4 gap-3 mt-3">
          <label className="text-sm">
            Annee
            <input
              className="input-bledi w-full mt-1"
              type="number"
              placeholder="2023"
              value={form.year}
              onChange={(e) => set({ year: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Carburant
            <select
              className="input-bledi w-full mt-1"
              value={form.fuel}
              onChange={(e) => set({ fuel: e.target.value })}
            >
              <option value="essence">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="hybride">Hybride</option>
              <option value="electrique">Electrique</option>
              <option value="gpl">GPL</option>
            </select>
          </label>
          <label className="text-sm">
            Puissance fiscale (CV)
            <input
              className="input-bledi w-full mt-1"
              type="number"
              placeholder="5"
              value={form.fiscalPower}
              onChange={(e) => set({ fiscalPower: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Kilometrage
            <input
              className="input-bledi w-full mt-1"
              type="number"
              placeholder="au compteur"
              value={form.mileage}
              onChange={(e) => set({ mileage: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Portes
            <input
              className="input-bledi w-full mt-1"
              type="number"
              value={form.doors}
              onChange={(e) => set({ doors: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Couleur
            <input
              className="input-bledi w-full mt-1"
              placeholder="Blanc"
              value={form.color}
              onChange={(e) => set({ color: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Km inclus / jour
            <input
              className="input-bledi w-full mt-1"
              type="number"
              placeholder="vide = illimite"
              value={form.kmPerDay}
              onChange={(e) => set({ kmPerDay: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Km supplementaire
            <input
              className="input-bledi w-full mt-1"
              type="number"
              placeholder="TND / km"
              value={form.extraKmPrice}
              onChange={(e) => set({ extraKmPrice: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Age minimum
            <input
              className="input-bledi w-full mt-1"
              type="number"
              value={form.minDriverAge}
              onChange={(e) => set({ minDriverAge: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Permis depuis (ans)
            <input
              className="input-bledi w-full mt-1"
              type="number"
              value={form.minLicenceYears}
              onChange={(e) => set({ minLicenceYears: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Carburant
            <select
              className="input-bledi w-full mt-1"
              value={form.fuelPolicy}
              onChange={(e) => set({ fuelPolicy: e.target.value })}
            >
              <option value="plein_a_plein">Rendu avec le plein</option>
              <option value="plein_a_vide">Plein paye au depart</option>
              <option value="identique">Rendu au meme niveau</option>
            </select>
          </label>
          <label className="text-sm">
            Caution
            <input
              className="input-bledi w-full mt-1"
              type="number"
              placeholder="TND"
              value={form.deposit}
              onChange={(e) => set({ deposit: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Lieu de prise en charge
            <input
              className="input-bledi w-full mt-1"
              placeholder="Agence, aeroport..."
              value={form.pickupLocation}
              onChange={(e) => set({ pickupLocation: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Livraison
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                className="w-4 h-4 accent-bledi-blue"
                checked={form.deliveryAvailable}
                onChange={(e) => set({ deliveryAvailable: e.target.checked })}
              />
              <input
                className="input-bledi w-full"
                type="number"
                placeholder="frais, 0 = offerte"
                disabled={!form.deliveryAvailable}
                value={form.deliveryFee}
                onChange={(e) => set({ deliveryFee: e.target.value })}
              />
            </div>
          </label>
        </div>
      )}

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
