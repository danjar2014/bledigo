'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, History, AlertTriangle, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface Modification {
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  createdAt: string;
}

interface ListingEditProps {
  listing: any;
  /** Optionnel : si absent, le composant appelle lui-meme PATCH /listings/:id */
  onSave?: (data: any) => void | Promise<void>;
  onCancel?: () => void;
  /** Optionnel : si absent, l historique est charge depuis l API */
  modificationHistory?: Modification[];
  /** Optionnel : force l affichage de l avertissement re-verification */
  hasActiveBookings?: boolean;
}

const AMENITIES = [
  'WiFi', 'Climatisation', 'Chauffage', 'Cuisine equipee', 'Lave-linge',
  'Seche-linge', 'Fer a repasser', 'Television', 'Parking', 'Piscine',
  'Vue mer', 'Terrasse', 'Jardin', 'Barbecue', 'Seche-cheveux',
];

/** Doit rester aligne avec CRITICAL_FIELDS du backend (listings.service.ts). */
const CRITICAL_FIELDS = ['pricePerNight', 'maxGuests'];

function asArray(value: any): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function ListingEdit({
  listing,
  onSave,
  onCancel,
  modificationHistory,
  hasActiveBookings: forcedActiveBookings,
}: ListingEditProps) {
  const [formData, setFormData] = useState({
    title: listing?.title || '',
    description: listing?.description || '',
    pricePerNight: listing?.pricePerNight ?? '',
    cleaningFee: listing?.cleaningFee ?? '',
    serviceFee: listing?.serviceFee ?? '',
    securityDeposit: listing?.securityDeposit ?? '',
    maxGuests: listing?.maxGuests ?? 1,
    minNights: listing?.minNights ?? 1,
    maxNights: listing?.maxNights ?? '',
    checkInTime: listing?.checkInTime || '15:00',
    checkOutTime: listing?.checkOutTime || '11:00',
    instantBook: Boolean(listing?.instantBook),
    // `?? true` et non `Boolean(...)` : une annonce d avant ce champ renvoie
    // `undefined`, que Boolean() transformerait en false — elle se fermerait
    // aux familles a la premiere modification, sans que l hote l ait voulu.
    childrenAllowed: listing?.childrenAllowed ?? true,
    amenities: asArray(listing?.amenities),
    houseRules: asArray(listing?.houseRules),
    modificationReason: '',
  });

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Modification[]>(modificationHistory ?? []);
  const [hasActiveBookings, setHasActiveBookings] = useState(Boolean(forcedActiveBookings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (modificationHistory || !listing?.id) return;
    api
      .listingModifications(listing.id)
      .then((h) => setHistory(h || []))
      .catch(() => undefined);
  }, [listing?.id, modificationHistory]);

  useEffect(() => {
    if (forcedActiveBookings !== undefined || !listing?.id) return;
    api
      .availability(listing.id)
      .then((res) => setHasActiveBookings((res?.blocked?.length ?? 0) > 0))
      .catch(() => undefined);
  }, [listing?.id, forcedActiveBookings]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const toggleAmenity = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(item)
        ? prev.amenities.filter((a: string) => a !== item)
        : [...prev.amenities, item],
    }));
    setSaved(false);
  };

  async function handleSubmit() {
    if (saving) return;
    if (!formData.modificationReason.trim()) {
      setError('Merci d indiquer la raison de la modification.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      ...formData,
      pricePerNight: Number(formData.pricePerNight),
      cleaningFee: Number(formData.cleaningFee || 0),
      serviceFee: Number(formData.serviceFee || 0),
      securityDeposit: Number(formData.securityDeposit || 0),
      maxNights: formData.maxNights ? Number(formData.maxNights) : undefined,
    };

    try {
      if (onSave) {
        await onSave(payload);
      } else {
        await api.updateListing(listing.id, payload);
        const refreshed = await api.listingModifications(listing.id).catch(() => null);
        if (refreshed) setHistory(refreshed);
      }
      setSaved(true);
      setFormData((prev) => ({ ...prev, modificationReason: '' }));
    } catch (e: any) {
      setError(e?.message || 'La modification n a pas pu etre enregistree.');
    } finally {
      setSaving(false);
    }
  }

  const criticalClass = hasActiveBookings ? 'border-amber-300 bg-amber-50' : '';

  return (
    <div className="max-w-3xl mx-auto">
      {hasActiveBookings && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-bledi p-4 mb-6 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-800">Reservations actives detectees</div>
            <div className="text-sm text-amber-700">
              Vous avez des reservations en cours. La modification des champs critiques (
              {CRITICAL_FIELDS.join(', ')}) declenchera une re-verification par BlediGo et les
              voyageurs concernes seront notifies.
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-bledi shadow-bledi p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Modifier l annonce</h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-bledi-blue hover:underline"
          >
            <History className="w-4 h-4" />
            Historique ({history.length})
          </button>
        </div>

        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-cream rounded-lg p-4 space-y-2 overflow-hidden"
          >
            <h3 className="font-medium text-sm mb-3">Historique des modifications</h3>
            {history.length === 0 && (
              <p className="text-sm text-slate">Aucune modification enregistree.</p>
            )}
            {history.map((mod, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm py-2 border-b border-cloud last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-bledi-blue flex-shrink-0" />
                <span className="text-slate">{mod.fieldName}</span>
                <span className="text-slate line-through truncate max-w-[8rem]">{mod.oldValue}</span>
                <span>{'→'}</span>
                <span className="font-medium truncate max-w-[8rem]">{mod.newValue}</span>
                <span className="text-xs text-slate ml-auto flex-shrink-0">
                  {new Date(mod.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Titre de l annonce
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="input-bledi"
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="input-bledi"
            rows={5}
            maxLength={2000}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="pricePerNight" className="block text-sm font-medium mb-2">
              Prix/nuit
            </label>
            <input
              id="pricePerNight"
              type="number"
              min={0}
              value={formData.pricePerNight}
              onChange={(e) => handleChange('pricePerNight', e.target.value)}
              className={`input-bledi ${criticalClass}`}
            />
            {hasActiveBookings && (
              <span className="text-xs text-amber-600">Re-verification requise</span>
            )}
          </div>
          <div>
            <label htmlFor="cleaningFee" className="block text-sm font-medium mb-2">
              Frais menage
            </label>
            <input
              id="cleaningFee"
              type="number"
              min={0}
              value={formData.cleaningFee}
              onChange={(e) => handleChange('cleaningFee', e.target.value)}
              className="input-bledi"
            />
          </div>
          <div>
            <label htmlFor="serviceFee" className="block text-sm font-medium mb-2">
              Frais service
            </label>
            <input
              id="serviceFee"
              type="number"
              min={0}
              value={formData.serviceFee}
              onChange={(e) => handleChange('serviceFee', e.target.value)}
              className="input-bledi"
            />
          </div>
          <div>
            <label htmlFor="securityDeposit" className="block text-sm font-medium mb-2">
              Caution
            </label>
            <input
              id="securityDeposit"
              type="number"
              min={0}
              value={formData.securityDeposit}
              onChange={(e) => handleChange('securityDeposit', e.target.value)}
              className="input-bledi"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="maxGuests" className="block text-sm font-medium mb-2">
              Voyageurs max
            </label>
            <select
              id="maxGuests"
              value={formData.maxGuests}
              onChange={(e) => handleChange('maxGuests', Number(e.target.value))}
              className={`input-bledi ${criticalClass}`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="minNights" className="block text-sm font-medium mb-2">
              Nuits min
            </label>
            <select
              id="minNights"
              value={formData.minNights}
              onChange={(e) => handleChange('minNights', Number(e.target.value))}
              className="input-bledi"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="maxNights" className="block text-sm font-medium mb-2">
              Nuits max
            </label>
            <select
              id="maxNights"
              value={formData.maxNights || ''}
              onChange={(e) => handleChange('maxNights', e.target.value ? Number(e.target.value) : '')}
              className="input-bledi"
            >
              <option value="">Illimite</option>
              {[7, 14, 21, 30].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="checkInTime" className="block text-sm font-medium mb-2">
              Heure arrivee
            </label>
            <input
              id="checkInTime"
              type="time"
              value={formData.checkInTime}
              onChange={(e) => handleChange('checkInTime', e.target.value)}
              className="input-bledi"
            />
          </div>
          <div>
            <label htmlFor="checkOutTime" className="block text-sm font-medium mb-2">
              Heure depart
            </label>
            <input
              id="checkOutTime"
              type="time"
              value={formData.checkOutTime}
              onChange={(e) => handleChange('checkOutTime', e.target.value)}
              className="input-bledi"
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium mb-2">Equipements</span>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((item) => {
              const active = formData.amenities.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleAmenity(item)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    active ? 'bg-bledi-blue text-white' : 'bg-cloud text-slate hover:bg-bledi-blue/10'
                  }`}
                >
                  {active && <Check className="w-3 h-3 inline mr-1" />}
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Au-dessus de la reservation instantanee parce qu elle FILTRE : une
            famille qui cherche avec des enfants ne verra jamais l annonce si
            la case est decochee. */}
        <div className="flex items-center gap-3 p-4 bg-cream rounded-lg">
          <input
            type="checkbox"
            id="childrenAllowed"
            checked={formData.childrenAllowed}
            onChange={(e) => handleChange('childrenAllowed', e.target.checked)}
            className="w-5 h-5 rounded border-cloud text-bledi-red"
          />
          <label htmlFor="childrenAllowed" className="text-sm">
            <span className="font-medium">J accepte les enfants</span>
            <span className="text-slate block">
              Decoche, votre logement disparait des recherches faites avec des enfants. Il reste
              visible pour tous les autres voyageurs.
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3 p-4 bg-cream rounded-lg">
          <input
            type="checkbox"
            id="instantBook"
            checked={formData.instantBook}
            onChange={(e) => handleChange('instantBook', e.target.checked)}
            className="w-5 h-5 rounded border-cloud text-bledi-blue"
          />
          <label htmlFor="instantBook" className="text-sm">
            <span className="font-medium">Reservation instantanee</span>
            <span className="text-slate block">
              Les voyageurs peuvent reserver sans validation prealable
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="modificationReason" className="block text-sm font-medium mb-2">
            Raison de la modification *
          </label>
          <textarea
            id="modificationReason"
            value={formData.modificationReason}
            onChange={(e) => handleChange('modificationReason', e.target.value)}
            placeholder="Pourquoi modifiez-vous cette annonce ?"
            className="input-bledi"
            rows={2}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Modifications enregistrees.</p>}

        <div className="flex gap-4 pt-4 border-t border-cloud">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
          <button onClick={onCancel} className="btn-secondary flex-1">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
