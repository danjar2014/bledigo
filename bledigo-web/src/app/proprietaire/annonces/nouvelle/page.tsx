'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles, ImagePlus } from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { money } from '@/lib/format';

const TYPES = [
  ['apartment', 'Appartement'],
  ['villa', 'Villa'],
  ['house', 'Maison'],
  ['studio', 'Studio'],
  ['riad', 'Riad'],
  ['bungalow', 'Bungalow'],
  ['penthouse', 'Penthouse'],
  ['chalet', 'Chalet'],
];

const VILLES: Record<string, [number, number]> = {
  Hammamet: [36.4, 10.6167],
  Djerba: [33.8756, 10.8571],
  'La Marsa': [36.8783, 10.3247],
  'Sidi Bou Said': [36.8708, 10.3417],
  Tunis: [36.8065, 10.1815],
  Sousse: [35.8256, 10.6084],
};

function Formulaire() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: 'Hammamet',
    region: 'Nabeul',
    latitude: 36.4,
    longitude: 10.6167,
    propertyType: 'villa',
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    pricePerNight: 200,
    cleaningFee: 40,
    serviceFee: 20,
    currency: 'TND',
  });

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
      const listing = await api.createListing(form);
      for (let i = 0; i < photos.length; i++) {
        await api.addPhoto(listing.id, { url: photos[i], isPrimary: i === 0 });
      }
      await api.publishListing(listing.id);
      return listing;
    },
    onSuccess: (listing) => router.push(`/logements/${listing.slug}`),
  });

  const setCity = (city: string) => {
    const coords = VILLES[city];
    setForm({ ...form, city, latitude: coords?.[0] ?? form.latitude, longitude: coords?.[1] ?? form.longitude });
  };

  const addDemoPhoto = () => {
    setPhotos([...photos, `https://picsum.photos/seed/bledigo-${Date.now()}/1200/800`]);
  };

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6">Publier une annonce</h1>

        <div className="bg-white rounded-bledi shadow-bledi p-6 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Titre</label>
            <input
              className="input-bledi"
              placeholder="Villa avec piscine a Hammamet"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="input-bledi h-28"
              placeholder="Decrivez le logement, les equipements, le quartier... (100 caracteres minimum recommandes pour le score de confiance)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="text-xs text-slate mt-1">{form.description.length} caracteres</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ville</label>
            <select className="input-bledi" value={form.city} onChange={(e) => setCity(e.target.value)}>
              {Object.keys(VILLES).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <input
              className="input-bledi"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Adresse</label>
            <input
              className="input-bledi"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type de bien</label>
            <select
              className="input-bledi"
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
            >
              {TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Voyageurs max</label>
            <input
              type="number"
              min={1}
              className="input-bledi"
              value={form.maxGuests}
              onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chambres</label>
            <input
              type="number"
              min={0}
              className="input-bledi"
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Salles de bain</label>
            <input
              type="number"
              min={0}
              className="input-bledi"
              value={form.bathrooms}
              onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prix par nuit (TND)</label>
            <input
              type="number"
              min={0}
              className="input-bledi"
              value={form.pricePerNight}
              onChange={(e) => setForm({ ...form, pricePerNight: Number(e.target.value) })}
            />
            {suggestion?.sampleSize > 0 && (
              <div className="flex items-center gap-1 text-xs text-bledi-blue mt-1">
                <Sparkles className="w-3.5 h-3.5" />
                Prix conseille : {money(suggestion.suggested)} (sur {suggestion.sampleSize} annonces
                comparables)
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Frais de menage (TND)</label>
            <input
              type="number"
              min={0}
              className="input-bledi"
              value={form.cleaningFee}
              onChange={(e) => setForm({ ...form, cleaningFee: Number(e.target.value) })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Photos</label>
            <div className="flex flex-wrap gap-2 items-center">
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={p} alt="" className="w-24 h-16 object-cover rounded-bledi-sm" />
              ))}
              <button
                type="button"
                onClick={addDemoPhoto}
                className="flex items-center gap-2 border-2 border-dashed border-cloud text-slate px-4 py-3 rounded-bledi-sm hover:border-bledi-blue hover:text-bledi-blue"
              >
                <ImagePlus className="w-4 h-4" />
                Ajouter une photo
              </button>
            </div>
            <div className="text-xs text-slate mt-1">
              3 photos minimum pour eviter un signalement de fraude. En production, l upload passe
              par une URL S3 presignee.
            </div>
          </div>

          <div className="md:col-span-2">
            {create.error && (
              <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-3">
                {(create.error as Error).message}
              </div>
            )}
            <button
              onClick={() => create.mutate()}
              disabled={!form.title || !form.description || !form.address || create.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {create.isPending ? 'Publication...' : 'Creer et publier'}
            </button>
          </div>
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
