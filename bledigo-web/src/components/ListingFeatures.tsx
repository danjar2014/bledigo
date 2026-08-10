'use client';

import { useState } from 'react';
import { Check, X, Clock, Ruler, Layers, CalendarDays, Zap, Wallet } from 'lucide-react';
import AmenityIcon from '@/components/AmenityIcon';
import {
  AMENITY_GROUPS,
  HOUSE_RULES,
  PROXIMITY,
  amenityIcon,
  amenityLabel,
} from '@/lib/catalog';
import { useMoney } from '@/store/preferences';

/** Les champs JSON arrivent en tableau (postgres) ou en chaine (sqlite). */
function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

const VISIBLE_AMENITIES = 10;

export default function ListingFeatures({ listing }: { listing: any }) {
  const money = useMoney();
  const [showAll, setShowAll] = useState(false);

  const amenities = parseJson<string[]>(listing?.amenities, []);
  const houseRules = parseJson<{ key: string; allowed: boolean }[]>(listing?.houseRules, []);
  const extra = parseJson<{ text?: string; proximity?: string[] }>(listing?.rules, {});
  const proximity = extra?.proximity ?? [];

  // Ordonne les equipements selon le catalogue, puis garde les inconnus a la fin
  const ordered = AMENITY_GROUPS.flatMap((g) => g.items.map((i) => i.key)).filter((k) =>
    amenities.includes(k),
  );
  const unknown = amenities.filter((a) => !ordered.includes(a));
  const allAmenities = [...ordered, ...unknown];
  const shown = showAll ? allAmenities : allAmenities.slice(0, VISIBLE_AMENITIES);

  const specs = [
    listing?.surfaceM2 && { icon: Ruler, label: `${listing.surfaceM2} m² habitables` },
    listing?.floors > 1 && { icon: Layers, label: `${listing.floors} niveaux` },
    listing?.yearBuilt && { icon: CalendarDays, label: `Construit en ${listing.yearBuilt}` },
    listing?.minNights > 1 && { icon: CalendarDays, label: `${listing.minNights} nuits minimum` },
    listing?.maxNights && { icon: CalendarDays, label: `${listing.maxNights} nuits maximum` },
    listing?.instantBook && { icon: Zap, label: 'Reservation instantanee' },
    Number(listing?.securityDeposit) > 0 && {
      icon: Wallet,
      label: `Caution ${money(Number(listing.securityDeposit))}`,
    },
  ].filter(Boolean) as { icon: any; label: string }[];

  const hasNothing =
    allAmenities.length === 0 && houseRules.length === 0 && specs.length === 0 && !extra?.text;
  if (hasNothing) return null;

  return (
    <div className="space-y-8 mb-8">
      {/* Caracteristiques chiffrees */}
      {specs.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-xl mb-3">Caracteristiques</h2>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {specs.map((s) => {
              const Icon = s.icon;
              return (
                <span key={s.label} className="flex items-center gap-2 text-slate">
                  <Icon className="w-4 h-4 text-bledi-blue" />
                  {s.label}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Equipements */}
      {allAmenities.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-xl mb-3">
            Equipements{' '}
            <span className="text-slate font-normal text-base">({allAmenities.length})</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-y-2 gap-x-6">
            {shown.map((key) => (
              <span key={key} className="flex items-center gap-3 text-charcoal">
                <AmenityIcon name={amenityIcon(key)} className="w-5 h-5 text-slate" />
                {amenityLabel(key)}
              </span>
            ))}
          </div>
          {allAmenities.length > VISIBLE_AMENITIES && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-sm font-medium text-bledi-blue hover:underline"
            >
              {showAll
                ? 'Afficher moins'
                : `Afficher les ${allAmenities.length} equipements`}
            </button>
          )}
        </section>
      )}

      {/* Horaires */}
      {(listing?.checkInTime || listing?.checkOutTime) && (
        <section>
          <h2 className="font-display font-semibold text-xl mb-3">Horaires</h2>
          <div className="flex flex-wrap gap-8">
            {listing.checkInTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-bledi-blue" />
                <span className="text-slate">
                  Arrivee a partir de <strong className="text-charcoal">{listing.checkInTime}</strong>
                </span>
              </div>
            )}
            {listing.checkOutTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-bledi-blue" />
                <span className="text-slate">
                  Depart avant <strong className="text-charcoal">{listing.checkOutTime}</strong>
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Regles */}
      {(houseRules.length > 0 || extra?.text) && (
        <section>
          <h2 className="font-display font-semibold text-xl mb-3">Regles de la maison</h2>
          {houseRules.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-y-2 gap-x-6 mb-3">
              {houseRules.map((r) => {
                const meta = HOUSE_RULES.find((h) => h.key === r.key);
                if (!meta) return null;
                return (
                  <span key={r.key} className="flex items-center gap-3">
                    {r.allowed ? (
                      <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <span className={r.allowed ? 'text-charcoal' : 'text-slate'}>
                      {r.allowed ? meta.label : meta.deniedLabel}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          {extra?.text && (
            <p className="text-slate text-sm leading-relaxed whitespace-pre-line">{extra.text}</p>
          )}
        </section>
      )}

      {/* Proximite */}
      {proximity.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-xl mb-3">A proximite</h2>
          <div className="flex flex-wrap gap-2">
            {proximity.map((key) => {
              const meta = PROXIMITY.find((p) => p.key === key);
              if (!meta) return null;
              return (
                <span
                  key={key}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cloud text-sm text-charcoal"
                >
                  <AmenityIcon name={meta.icon} className="w-4 h-4 text-bledi-blue" />
                  {meta.label}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
