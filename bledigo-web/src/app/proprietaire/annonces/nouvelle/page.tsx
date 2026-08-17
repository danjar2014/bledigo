'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles, ImagePlus, Check, X, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import AmenityPicker from '@/components/AmenityPicker';
import HouseRulesPicker, { type RuleValue } from '@/components/HouseRulesPicker';
import { PROPERTY_TYPES, PROXIMITY } from '@/lib/catalog';
import AmenityIcon from '@/components/AmenityIcon';
import LocalityPicker, { type Locality } from '@/components/LocalityPicker';
import { useMoney } from '@/store/preferences';

const STEPS = ['Le logement', 'Caracteristiques', 'Equipements', 'Regles & tarifs', 'Photos'];

function Field({
  label,
  hint,
  children,
  span,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium mb-1 text-charcoal">{label}</label>
      {children}
      {hint && <div className="text-xs text-slate mt-1">{hint}</div>}
    </div>
  );
}

function Formulaire() {
  const money = useMoney();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [rules, setRules] = useState<Record<string, RuleValue>>({});
  const [proximity, setProximity] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    citySlug: '',
    city: '',
    region: '',
    postalCode: '',
    latitude: 0,
    longitude: 0,
    propertyType: 'villa',
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    surfaceM2: '' as number | '',
    floors: '' as number | '',
    yearBuilt: '' as number | '',
    pricePerNight: 200,
    cleaningFee: 40,
    serviceFee: 20,
    securityDeposit: 0,
    currency: 'TND',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    minNights: 1,
    maxNights: '' as number | '',
    instantBook: false,
    houseRulesText: '',
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const { data: suggestion } = useQuery({
    queryKey: ['price', form.city, form.propertyType, form.bedrooms],
    queryFn: () =>
      api.priceSuggestion({
        city: form.city,
        propertyType: form.propertyType,
        bedrooms: form.bedrooms,
      }),
  });

  const create = useMutation({
    mutationFn: async () => {
      // houseRulesText n existe que dans le formulaire : il part dans rules.text
      const { houseRulesText, ...fields } = form;
      const payload = {
        ...fields,
        surfaceM2: form.surfaceM2 === '' ? undefined : Number(form.surfaceM2),
        floors: form.floors === '' ? undefined : Number(form.floors),
        yearBuilt: form.yearBuilt === '' ? undefined : Number(form.yearBuilt),
        maxNights: form.maxNights === '' ? undefined : Number(form.maxNights),
        amenities,
        houseRules: Object.entries(rules)
          .filter(([, v]) => v !== 'unset')
          .map(([key, v]) => ({ key, allowed: v === 'allowed' })),
        rules: {
          text: houseRulesText,
          proximity,
        },
      };
      const listing = await api.createListing(payload);
      for (let i = 0; i < photos.length; i++) {
        await api.addPhoto(listing.id, { url: photos[i], isPrimary: i === 0 });
      }
      await api.publishListing(listing.id);
      return listing;
    },
    onSuccess: (listing) => router.push(`/logements/${listing.slug}`),
  });

  /** La ville vient du referentiel : region et coordonnees suivent. */
  const setLocality = (loc: Locality | null) =>
    set({
      citySlug: loc?.slug ?? '',
      city: loc?.name ?? '',
      region: loc?.region ?? '',
      latitude: loc?.lat ?? 0,
      longitude: loc?.lng ?? 0,
    });

  const toggleAmenity = (key: string) =>
    setAmenities((a) => (a.includes(key) ? a.filter((x) => x !== key) : [...a, key]));

  const toggleProximity = (key: string) =>
    setProximity((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  const addDemoPhoto = () =>
    setPhotos((p) => [...p, `https://picsum.photos/seed/bledigo-${Date.now()}-${p.length}/1200/800`]);

  const canSubmit =
    form.citySlug !== '' &&
    form.title.length >= 10 &&
    form.description.length >= 100 &&
    form.address.length > 3 &&
    photos.length >= 3;

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-1">Publier une annonce</h1>
        <p className="text-slate mb-6">
          Plus votre annonce est detaillee, meilleur est votre score de confiance et votre
          positionnement dans les resultats.
        </p>

        {/* Etapes */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                step === i
                  ? 'bg-bledi-blue text-white'
                  : 'bg-white text-slate border border-cloud hover:border-bledi-blue'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-bledi shadow-bledi p-6">
          {/* --- 1. Le logement --- */}
          {step === 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Titre de l annonce" span hint={`${form.title.length} / 150 caracteres`}>
                <input
                  className="input-bledi"
                  maxLength={150}
                  placeholder="Villa avec piscine a 5 min de la plage"
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value })}
                />
              </Field>

              <Field
                label="Description"
                span
                hint={`${form.description.length} caracteres — 100 minimum recommandes`}
              >
                <textarea
                  className="input-bledi h-40"
                  placeholder="Decrivez le logement, l agencement, le quartier, ce qui le rend unique..."
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                />
              </Field>

              <Field label="Type de bien">
                <select
                  className="input-bledi"
                  value={form.propertyType}
                  onChange={(e) => set({ propertyType: e.target.value })}
                >
                  {PROPERTY_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <LocalityPicker
                id="city"
                label="Ville"
                required
                placeholder="Choisir une ville"
                value={form.citySlug}
                onChange={setLocality}
              />

              <Field label="Gouvernorat" hint="Determine par la ville choisie">
                <input className="input-bledi bg-cloud" value={form.region} readOnly />
              </Field>

              <Field label="Code postal">
                <input
                  className="input-bledi"
                  value={form.postalCode}
                  onChange={(e) => set({ postalCode: e.target.value })}
                />
              </Field>

              <Field
                label="Adresse"
                span
                hint="L adresse exacte n est communiquee au voyageur qu apres confirmation de la reservation."
              >
                <input
                  className="input-bledi"
                  value={form.address}
                  onChange={(e) => set({ address: e.target.value })}
                />
              </Field>
            </div>
          )}

          {/* --- 2. Caracteristiques --- */}
          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Voyageurs maximum">
                <input
                  type="number"
                  min={1}
                  className="input-bledi"
                  value={form.maxGuests}
                  onChange={(e) => set({ maxGuests: Number(e.target.value) })}
                />
              </Field>
              <Field label="Chambres">
                <input
                  type="number"
                  min={0}
                  className="input-bledi"
                  value={form.bedrooms}
                  onChange={(e) => set({ bedrooms: Number(e.target.value) })}
                />
              </Field>
              <Field label="Salles de bain">
                <input
                  type="number"
                  min={0}
                  className="input-bledi"
                  value={form.bathrooms}
                  onChange={(e) => set({ bathrooms: Number(e.target.value) })}
                />
              </Field>
              <Field label="Surface habitable (m²)">
                <input
                  type="number"
                  min={0}
                  className="input-bledi"
                  placeholder="130"
                  value={form.surfaceM2}
                  onChange={(e) =>
                    set({ surfaceM2: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Nombre de niveaux">
                <input
                  type="number"
                  min={1}
                  className="input-bledi"
                  placeholder="1"
                  value={form.floors}
                  onChange={(e) =>
                    set({ floors: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Annee de construction">
                <input
                  type="number"
                  min={1800}
                  max={new Date().getFullYear()}
                  className="input-bledi"
                  placeholder="2015"
                  value={form.yearBuilt}
                  onChange={(e) =>
                    set({ yearBuilt: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                />
              </Field>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-charcoal">
                  A proximite
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROXIMITY.map((p) => {
                    const active = proximity.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggleProximity(p.key)}
                        aria-pressed={active}
                        className={`flex items-center gap-2 px-3 py-2 rounded-bledi-sm text-sm border transition-all ${
                          active
                            ? 'bg-bledi-blue text-white border-bledi-blue'
                            : 'bg-white text-slate border-cloud hover:border-bledi-blue'
                        }`}
                      >
                        <AmenityIcon name={p.icon} className="w-4 h-4" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* --- 3. Equipements --- */}
          {step === 2 && (
            <>
              <p className="text-sm text-slate mb-4">
                {amenities.length} equipement(s) selectionne(s). Les annonces detaillees sont
                reservees plus souvent.
              </p>
              <AmenityPicker selected={amenities} onToggle={toggleAmenity} />
            </>
          )}

          {/* --- 4. Regles et tarifs --- */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-semibold mb-3">Regles de la maison</h2>
                <HouseRulesPicker
                  rules={rules}
                  onChange={(key, value) => setRules((r) => ({ ...r, [key]: value }))}
                />
              </div>

              <Field
                label="Precisions libres"
                hint="Caution, gardien, acces, consignes particulieres..."
              >
                <textarea
                  className="input-bledi h-24"
                  placeholder="Residence securisee avec gardien. Caution de 500 TND restituee au depart."
                  value={form.houseRulesText}
                  onChange={(e) => set({ houseRulesText: e.target.value })}
                />
              </Field>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Heure d arrivee">
                  <input
                    type="time"
                    className="input-bledi"
                    value={form.checkInTime}
                    onChange={(e) => set({ checkInTime: e.target.value })}
                  />
                </Field>
                <Field label="Heure de depart">
                  <input
                    type="time"
                    className="input-bledi"
                    value={form.checkOutTime}
                    onChange={(e) => set({ checkOutTime: e.target.value })}
                  />
                </Field>
                <Field label="Nuits minimum">
                  <input
                    type="number"
                    min={1}
                    className="input-bledi"
                    value={form.minNights}
                    onChange={(e) => set({ minNights: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Nuits maximum" hint="Laisser vide pour illimite">
                  <input
                    type="number"
                    min={1}
                    className="input-bledi"
                    value={form.maxNights}
                    onChange={(e) =>
                      set({ maxNights: e.target.value === '' ? '' : Number(e.target.value) })
                    }
                  />
                </Field>

                <Field label="Prix par nuit (TND)">
                  <input
                    type="number"
                    min={0}
                    className="input-bledi"
                    value={form.pricePerNight}
                    onChange={(e) => set({ pricePerNight: Number(e.target.value) })}
                  />
                  {suggestion?.sampleSize > 0 && (
                    <div className="flex items-center gap-1 text-xs text-bledi-blue mt-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Prix conseille : {money(suggestion.suggested)} (sur {suggestion.sampleSize}{' '}
                      annonces comparables)
                    </div>
                  )}
                </Field>
                <Field label="Frais de menage (TND)">
                  <input
                    type="number"
                    min={0}
                    className="input-bledi"
                    value={form.cleaningFee}
                    onChange={(e) => set({ cleaningFee: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Frais de service (TND)">
                  <input
                    type="number"
                    min={0}
                    className="input-bledi"
                    value={form.serviceFee}
                    onChange={(e) => set({ serviceFee: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Caution (TND)" hint="Bloquee, non prelevee sauf degat constate">
                  <input
                    type="number"
                    min={0}
                    className="input-bledi"
                    value={form.securityDeposit}
                    onChange={(e) => set({ securityDeposit: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-3 p-4 bg-cream rounded-bledi-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.instantBook}
                  onChange={(e) => set({ instantBook: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm">
                  <span className="font-medium">Reservation instantanee</span>
                  <span className="text-slate block">
                    Les voyageurs reservent sans validation prealable de votre part.
                  </span>
                </span>
              </label>
            </div>
          )}

          {/* --- 5. Photos --- */}
          {step === 4 && (
            <div>
              <div className="flex flex-wrap gap-3 items-center mb-3">
                {photos.map((p, i) => (
                  <div key={p} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt="" className="w-32 h-24 object-cover rounded-bledi-sm" />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 bg-bledi-blue text-white text-[10px] px-1.5 py-0.5 rounded">
                        Principale
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotos((ps) => ps.filter((x) => x !== p))}
                      className="absolute top-1 right-1 bg-white/90 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Retirer la photo"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDemoPhoto}
                  className="flex items-center gap-2 border-2 border-dashed border-cloud text-slate px-4 py-6 rounded-bledi-sm hover:border-bledi-blue hover:text-bledi-blue"
                >
                  <ImagePlus className="w-4 h-4" />
                  Ajouter une image de demonstration
                </button>
              </div>
              {/* Dire ce que ce bouton fait vraiment. Il n envoie aucun fichier : il
                  empile une image de stock aleatoire. Un hote qui croit avoir mis
                  les photos de sa villa publie l interieur de quelqu un d autre. */}
              <p className="text-xs text-red-700 bg-red-50 rounded p-2">
                L envoi de vos propres photos n est pas encore disponible : ce bouton ajoute une
                image de stock, le temps que le stockage soit raccorde. 3 images minimum, la
                premiere sert de visuel principal.
              </p>

              {/* Recapitulatif */}
              <div className="mt-6 border-t border-cloud pt-4">
                <h3 className="font-display font-semibold mb-2">Avant publication</h3>
                <ul className="text-sm space-y-1">
                  {[
                    [form.title.length >= 10, 'Titre d au moins 10 caracteres'],
                    [form.description.length >= 100, 'Description d au moins 100 caracteres'],
                    [form.citySlug !== '', 'Ville choisie dans la liste'],
                    [form.address.length > 3, 'Adresse renseignee'],
                    [photos.length >= 3, '3 photos minimum'],
                    [amenities.length >= 5, '5 equipements minimum (recommande)'],
                  ].map(([ok, label]) => (
                    <li key={label as string} className="flex items-center gap-2">
                      {ok ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className={ok ? 'text-slate' : 'text-charcoal'}>{label as string}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-wrap items-center gap-3 mt-8 pt-4 border-t border-cloud">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn-secondary">
                Precedent
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary ms-auto">
                Suivant
              </button>
            ) : (
              <button
                onClick={() => create.mutate()}
                disabled={!canSubmit || create.isPending}
                className="btn-primary ms-auto disabled:opacity-50"
              >
                {create.isPending ? 'Publication...' : 'Creer et publier'}
              </button>
            )}
          </div>

          {create.error && (
            <div className="text-sm text-red-700 bg-red-50 rounded p-2 mt-3">
              {(create.error as Error).message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <RequireAuth roles={['owner', 'agency']}>
      <Formulaire />
    </RequireAuth>
  );
}
