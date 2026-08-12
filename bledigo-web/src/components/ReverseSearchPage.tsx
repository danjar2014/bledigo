'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Star, MapPin, Users, Bed, Bath, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import LocalityPicker, { type Locality } from '@/components/LocalityPicker';

const AMENITIES = [
  'Piscine', 'Vue mer', 'Climatisation', 'WiFi', 'Parking',
  'Cuisine equipee', 'Terrasse', 'Jardin',
];
const PROPERTY_TYPES = ['villa', 'apartment', 'house', 'studio', 'riad'];
const PROPERTY_LABELS: Record<string, string> = {
  villa: 'Villa',
  apartment: 'Appartement',
  house: 'Maison',
  studio: 'Studio',
  riad: 'Riad',
};
const CERTIFICATIONS = [
  { value: '', label: 'Indifferent' },
  { value: 'bronze', label: 'Bronze et +' },
  { value: 'silver', label: 'Argent et +' },
  { value: 'gold', label: 'Or et +' },
  { value: 'diamond', label: 'Diamant' },
];

interface ReverseSearchPageProps {
  /** Reprend une recherche existante et affiche directement ses offres. */
  reverseSearchId?: string;
}

export default function ReverseSearchPage({ reverseSearchId }: ReverseSearchPageProps) {
  const [step, setStep] = useState<'form' | 'offers'>(reverseSearchId ? 'offers' : 'form');
  const [searchId, setSearchId] = useState<string | null>(reverseSearchId ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    city: '',
    citySlug: '',
    checkIn: '',
    checkOut: '',
    guestsCount: 2,
    bedrooms: 1,
    bathrooms: 1,
    budgetMin: '',
    budgetMax: '',
    amenitiesRequired: [] as string[],
    propertyTypes: [] as string[],
    certificationMin: '',
  });

  const [sortBy, setSortBy] = useState('rating');
  const [minRating, setMinRating] = useState(0);
  const [minTrustScore, setMinTrustScore] = useState(0);
  const [offers, setOffers] = useState<any[]>([]);
  const [searchDetails, setSearchDetails] = useState<any>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [countering, setCountering] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState('');

  useEffect(() => {
    if (step !== 'offers' || !searchId) return;
    let cancelled = false;
    setLoadingOffers(true);
    api
      .reverseOffers(searchId, { sortBy, minRating, minTrustScore })
      .then((res) => {
        if (cancelled) return;
        setOffers(res.offers ?? res.items ?? []);
        setSearchDetails(res.searchDetails ?? null);
      })
      .catch((e) => !cancelled && setError(e?.message || 'Impossible de charger les offres.'))
      .finally(() => !cancelled && setLoadingOffers(false));
    return () => {
      cancelled = true;
    };
  }, [step, searchId, sortBy, minRating, minTrustScore]);

  const toggle = (field: 'amenitiesRequired' | 'propertyTypes', item: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((a) => a !== item)
        : [...prev[field], item],
    }));
  };

  async function handleSubmit() {
    if (submitting) return;
    if (!formData.citySlug || !formData.checkIn || !formData.checkOut) {
      setError('Choisissez une destination dans la liste, ainsi que vos dates.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createReverseSearch({
        ...formData,
        title: formData.title || `Sejour a ${formData.destination}`,
        guestsCount: Number(formData.guestsCount),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        budgetMin: formData.budgetMin ? Number(formData.budgetMin) : undefined,
        budgetMax: formData.budgetMax ? Number(formData.budgetMax) : undefined,
        certificationMin: formData.certificationMin || undefined,
      });
      setSearchId(created.id);
      setStep('offers');
    } catch (e: any) {
      setError(e?.message || 'La publication a echoue.');
    } finally {
      setSubmitting(false);
    }
  }

  async function acceptOffer(offerId: string) {
    if (!searchId || accepting) return;
    setAccepting(offerId);
    setError(null);
    try {
      await api.acceptReverseOffer(searchId, offerId);
      setAccepted(offerId);
    } catch (e: any) {
      setError(e?.message || 'L acceptation a echoue.');
    } finally {
      setAccepting(null);
    }
  }

  /** Recharge la liste apres une action sur une offre. */
  async function reload() {
    if (!searchId) return;
    const res = await api.reverseOffers(searchId, { sortBy, minRating, minTrustScore });
    setOffers(res.offers ?? res.items ?? []);
  }

  async function rejectOffer(offerId: string) {
    if (busy) return;
    setBusy(offerId);
    setError(null);
    try {
      await api.rejectReverseOffer(offerId);
      await reload();
    } catch (e: any) {
      setError(e?.message || 'Le refus a echoue.');
    } finally {
      setBusy(null);
    }
  }

  async function sendCounter(offerId: string) {
    if (busy) return;
    const price = Number(counterPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError('Indiquez un montant valide.');
      return;
    }
    setBusy(offerId);
    setError(null);
    try {
      await api.counterReverseOffer(offerId, price);
      setCountering(null);
      setCounterPrice('');
      await reload();
    } catch (e: any) {
      setError(e?.message || 'La contre-proposition a echoue.');
    } finally {
      setBusy(null);
    }
  }

  // ---------------------------------------------------------------- offres

  if (step === 'offers') {
    return (
      <div className="min-h-screen bg-cream">
        <div className="bg-bledi-blue text-white py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-display font-bold mb-2">
              Offres recues pour votre recherche
            </h1>
            {searchDetails && (
              <p className="text-white/80">
                {searchDetails.destination} ·{' '}
                {new Date(searchDetails.checkIn).toLocaleDateString('fr-FR')} au{' '}
                {new Date(searchDetails.checkOut).toLocaleDateString('fr-FR')} ·{' '}
                {searchDetails.guestsCount} voyageurs
              </p>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-bledi p-4 mb-6 shadow-bledi">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate" />
                <label htmlFor="sortBy" className="text-sm font-medium">
                  Trier par :
                </label>
              </div>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-lg border border-cloud text-sm"
              >
                <option value="rating">Meilleure note</option>
                <option value="price_asc">Prix croissant</option>
                <option value="trust">Score confiance</option>
                <option value="newest">Plus recentes</option>
              </select>

              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-bledi-gold" />
                <label htmlFor="minRating" className="text-sm">
                  Note min :
                </label>
                <input
                  id="minRating"
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm font-medium">{minRating}</span>
              </div>

              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-bledi-blue" />
                <label htmlFor="minTrust" className="text-sm">
                  Confiance min :
                </label>
                <input
                  id="minTrust"
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={minTrustScore}
                  onChange={(e) => setMinTrustScore(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm font-medium">{minTrustScore}</span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {loadingOffers && <p className="text-sm text-slate mb-4">Chargement des offres...</p>}
          {!loadingOffers && offers.length === 0 && (
            <div className="bg-white rounded-bledi shadow-bledi p-8 text-center">
              <p className="text-slate">
                Aucune offre pour le moment. Les proprietaires sont notifies, revenez d ici quelques
                heures.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <AnimatePresence>
              {offers.map((offer) => {
                const listing = offer.listing ?? {};
                const owner = listing.owner ?? offer.owner ?? {};
                const photo = listing.photos?.[0]?.url;
                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-white rounded-bledi shadow-bledi overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-72 h-48 md:h-auto bg-cloud relative">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate text-sm px-4 text-center">
                            {listing.title}
                          </div>
                        )}
                        {listing.certificationLevel && listing.certificationLevel !== 'none' && (
                          <div className="absolute top-3 left-3">
                            <span
                              className={`badge-${listing.certificationLevel} text-xs px-2 py-1`}
                            >
                              {listing.certificationLevel}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-6">
                        <div className="flex justify-between items-start mb-3 gap-4">
                          <div>
                            <h3 className="text-xl font-display font-bold">{listing.title}</h3>
                            <div className="flex items-center gap-1 text-slate text-sm mt-1">
                              <MapPin className="w-4 h-4" />
                              {listing.city}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 text-bledi-gold">
                              <Star className="w-4 h-4 fill-bledi-gold" />
                              <span className="font-bold">
                                {Number(listing.avgRating ?? 0).toFixed(1)}
                              </span>
                              <span className="text-slate text-sm">
                                ({listing.totalReviews ?? 0})
                              </span>
                            </div>
                          </div>
                        </div>

                        {owner.firstName && (
                          <div className="flex items-center gap-3 mb-4 p-3 bg-cream rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-bledi-blue text-white flex items-center justify-center font-bold">
                              {owner.firstName[0]}
                            </div>
                            <div>
                              <div className="font-medium">{owner.firstName}</div>
                              <div className="text-xs text-slate">
                                Score confiance {owner.ownerPassport?.trustScore ?? '-'} ·{' '}
                                {owner.ownerPassport?.totalBookings ?? 0} sejours
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-4 text-sm text-slate mb-4">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" /> {listing.maxGuests}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bed className="w-4 h-4" /> {listing.bedrooms}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="w-4 h-4" /> {listing.bathrooms}
                          </span>
                        </div>

                        {offer.message && (
                          <p className="text-sm text-charcoal bg-cream p-3 rounded-lg mb-4 italic">
                            {offer.message}
                          </p>
                        )}

                        <div className="flex flex-wrap items-end justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-bledi-blue">
                                {offer.proposedPrice}
                              </span>
                              {offer.originalPrice > offer.proposedPrice && (
                                <>
                                  <span className="text-slate line-through">
                                    {offer.originalPrice}
                                  </span>
                                  <span className="text-emerald-600 text-sm font-medium">
                                    -{offer.discountPercent}%
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-sm text-slate">par nuit</span>
                          </div>
                          {offer.status === 'countered' ? (
                            <span className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-bledi-sm">
                              Votre contre-proposition de {offer.counterPrice} est en attente de
                              reponse de l hote.
                            </span>
                          ) : countering === offer.id ? (
                            <div className="flex flex-wrap items-end gap-2">
                              <div>
                                <label
                                  htmlFor={`counter-${offer.id}`}
                                  className="block text-xs text-slate mb-1"
                                >
                                  Votre proposition / nuit
                                </label>
                                <input
                                  id={`counter-${offer.id}`}
                                  type="number"
                                  min={1}
                                  max={offer.proposedPrice - 1}
                                  value={counterPrice}
                                  onChange={(e) => setCounterPrice(e.target.value)}
                                  placeholder={String(Math.round(offer.proposedPrice * 0.9))}
                                  className="input-bledi w-32"
                                />
                              </div>
                              <button
                                onClick={() => sendCounter(offer.id)}
                                disabled={busy !== null}
                                className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                              >
                                Envoyer
                              </button>
                              <button
                                onClick={() => {
                                  setCountering(null);
                                  setCounterPrice('');
                                }}
                                className="btn-secondary px-4 py-2 text-sm"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => acceptOffer(offer.id)}
                                disabled={accepting !== null || accepted !== null || busy !== null}
                                className="btn-primary px-6 py-3 disabled:opacity-60"
                              >
                                {accepted === offer.id
                                  ? 'Reservation creee'
                                  : accepting === offer.id
                                    ? 'Traitement...'
                                    : 'Reserver cette offre'}
                              </button>
                              <button
                                onClick={() => {
                                  setCountering(offer.id);
                                  setCounterPrice('');
                                  setError(null);
                                }}
                                disabled={busy !== null || accepted !== null}
                                className="btn-secondary px-4 py-3 text-sm disabled:opacity-60"
                                title="Proposer un autre montant a l hote"
                              >
                                Negocier le prix
                              </button>
                              <button
                                onClick={() => rejectOffer(offer.id)}
                                disabled={busy !== null || accepted !== null}
                                className="px-3 py-3 text-sm text-red-600 hover:underline disabled:opacity-60"
                              >
                                {busy === offer.id ? '...' : 'Refuser'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- formulaire

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-charcoal mb-2">
            Publiez votre recherche
          </h1>
          <p className="text-slate">
            Decrivez votre besoin et recevez des offres personnalisees de proprietaires verifies
          </p>
        </div>

        <div className="bg-white rounded-bledi shadow-bledi p-6 space-y-6">
          <LocalityPicker
            id="destination"
            label="Destination"
            required
            value={formData.citySlug}
            onChange={(loc: Locality | null) =>
              setFormData({
                ...formData,
                citySlug: loc?.slug ?? '',
                city: loc?.name ?? '',
                destination: loc?.name ?? '',
              })
            }
          />

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Votre besoin
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Precisez vos attentes : ambiance, quartier, contraintes..."
              className="input-bledi"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkIn" className="block text-sm font-medium mb-2">
                Arrivee *
              </label>
              <input
                id="checkIn"
                type="date"
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                className="input-bledi"
              />
            </div>
            <div>
              <label htmlFor="checkOut" className="block text-sm font-medium mb-2">
                Depart *
              </label>
              <input
                id="checkOut"
                type="date"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                className="input-bledi"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="guestsCount" className="block text-sm font-medium mb-2">
                Voyageurs
              </label>
              <input
                id="guestsCount"
                type="number"
                min={1}
                value={formData.guestsCount}
                onChange={(e) => setFormData({ ...formData, guestsCount: Number(e.target.value) })}
                className="input-bledi"
              />
            </div>
            <div>
              <label htmlFor="bedrooms" className="block text-sm font-medium mb-2">
                Chambres
              </label>
              <input
                id="bedrooms"
                type="number"
                min={0}
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                className="input-bledi"
              />
            </div>
            <div>
              <label htmlFor="bathrooms" className="block text-sm font-medium mb-2">
                Salles de bain
              </label>
              <input
                id="bathrooms"
                type="number"
                min={0}
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                className="input-bledi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budgetMin" className="block text-sm font-medium mb-2">
                Budget min / nuit
              </label>
              <input
                id="budgetMin"
                type="number"
                min={0}
                value={formData.budgetMin}
                onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                className="input-bledi"
              />
            </div>
            <div>
              <label htmlFor="budgetMax" className="block text-sm font-medium mb-2">
                Budget max / nuit
              </label>
              <input
                id="budgetMax"
                type="number"
                min={0}
                value={formData.budgetMax}
                onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                className="input-bledi"
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Type de bien</span>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((type) => {
                const active = formData.propertyTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggle('propertyTypes', type)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      active ? 'bg-bledi-blue text-white' : 'bg-cloud text-slate hover:bg-bledi-blue/10'
                    }`}
                  >
                    {PROPERTY_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Equipements souhaites</span>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((item) => {
                const active = formData.amenitiesRequired.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggle('amenitiesRequired', item)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      active ? 'bg-bledi-blue text-white' : 'bg-cloud text-slate hover:bg-bledi-blue/10'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="certificationMin" className="block text-sm font-medium mb-2">
              Certification minimale
            </label>
            <select
              id="certificationMin"
              value={formData.certificationMin}
              onChange={(e) => setFormData({ ...formData, certificationMin: e.target.value })}
              className="input-bledi"
            >
              {CERTIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full py-4 disabled:opacity-60"
          >
            {submitting ? 'Publication...' : 'Publier ma recherche'}
          </button>
          <p className="text-xs text-slate text-center">
            Votre recherche reste active 7 jours. Les proprietaires de votre zone pourront
            vous faire une offre.
          </p>
        </div>
      </div>
    </div>
  );
}
