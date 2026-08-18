'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, useMap } from 'react-leaflet';
import { Pencil, Trash2, Search, Star, Shield } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { usePreferences } from '@/store/preferences';
import { photoOf } from '@/lib/format';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Centre par defaut : Tunisie entiere. */
const DEFAULT_CENTER: LatLng = { lat: 35.5, lng: 10.0 };
const DEFAULT_ZOOM = 7;

/** Marqueur prix : un DivIcon evite le probleme d icone par defaut de Leaflet avec les bundlers. */
function priceIcon(label: string, highlighted: boolean) {
  return L.divIcon({
    className: '',
    html: `<span class="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold shadow
             ${highlighted ? 'bg-bledi-blue text-white' : 'bg-white text-charcoal'}
             border border-cloud">${label}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Remonte les deplacements de carte et les clics de trace au parent. */
function MapEvents({
  drawing,
  onBoundsChange,
  onDrawPoint,
  onDrawFinish,
}: {
  drawing: boolean;
  onBoundsChange: (b: L.LatLngBounds) => void;
  onDrawPoint: (p: LatLng) => void;
  onDrawFinish: () => void;
}) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
    click: (e) => {
      if (drawing) onDrawPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    dblclick: () => {
      if (drawing) onDrawFinish();
    },
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
    // Le double-clic sert a fermer le trace : on desactive le zoom associe
    if (drawing) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
  }, [map, drawing, onBoundsChange]);

  return null;
}

/** Recentre la carte quand la page fournit des coordonnees initiales. */
function Recenter({ center, zoom }: { center: LatLng | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], zoom ?? map.getZoom());
  }, [map, center, zoom]);
  return null;
}

interface MapSearchProps {
  initialCenter?: LatLng | null;
  initialZoom?: number;
}

export default function MapSearch({ initialCenter = null, initialZoom }: MapSearchProps) {
  const { t, money } = usePreferences();

  const [drawing, setDrawing] = useState(false);
  const [polygon, setPolygon] = useState<LatLng[]>([]);
  const [appliedPolygon, setAppliedPolygon] = useState<LatLng[] | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Evite les appels en rafale pendant le deplacement de la carte
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchListings = useCallback(
    async (b: L.LatLngBounds | null, poly: LatLng[] | null) => {
      if (!b && !poly) return;
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = poly
          ? { polygon: JSON.stringify(poly.map((p) => [p.lat, p.lng])) }
          : {
              north: b!.getNorth(),
              south: b!.getSouth(),
              east: b!.getEast(),
              west: b!.getWest(),
            };
        const res = await api.mapListings(params);
        setItems(res.items ?? []);
      } catch (e: any) {
        setError(e?.message || 'Impossible de charger les logements.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleBoundsChange = useCallback(
    (b: L.LatLngBounds) => {
      setBounds(b);
      if (appliedPolygon) return; // la zone tracee prime sur le cadrage
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => fetchListings(b, null), 400);
    },
    [appliedPolygon, fetchListings],
  );

  function startDrawing() {
    setDrawing(true);
    setPolygon([]);
    setAppliedPolygon(null);
  }

  function finishDrawing() {
    if (polygon.length < 3) return;
    setDrawing(false);
    setAppliedPolygon(polygon);
    fetchListings(null, polygon);
  }

  function clearArea() {
    setDrawing(false);
    setPolygon([]);
    setAppliedPolygon(null);
    fetchListings(bounds, null);
  }

  const positions = useMemo(
    () => polygon.map((p) => [p.lat, p.lng] as [number, number]),
    [polygon],
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Carte */}
      <div className="relative flex-1 min-h-[50vh]">
        <MapContainer
          center={[initialCenter?.lat ?? DEFAULT_CENTER.lat, initialCenter?.lng ?? DEFAULT_CENTER.lng]}
          zoom={initialZoom ?? DEFAULT_ZOOM}
          scrollWheelZoom
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Recenter center={initialCenter} zoom={initialZoom} />
          <MapEvents
            drawing={drawing}
            onBoundsChange={handleBoundsChange}
            onDrawPoint={(p) => setPolygon((prev) => [...prev, p])}
            onDrawFinish={finishDrawing}
          />

          {positions.length >= 2 && (
            <Polygon
              positions={positions}
              pathOptions={{ color: '#0A2540', fillColor: '#0A2540', fillOpacity: 0.12, weight: 2 }}
            />
          )}

          {items.map((l) => (
            <Marker
              key={l.id}
              position={[l.latitude, l.longitude]}
              icon={priceIcon(money(Number(l.pricePerNight)), hovered === l.id)}
              eventHandlers={{
                mouseover: () => setHovered(l.id),
                mouseout: () => setHovered(null),
              }}
            >
              <Popup>
                <Link href={`/logements/${l.slug || l.id}`} className="block w-52">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoOf(l)}
                    alt={l.title}
                    className="w-full h-28 object-cover rounded mb-2"
                  />
                  <div className="font-medium text-charcoal leading-tight">{l.title}</div>
                  <div className="text-xs text-slate">{l.city}</div>
                  <div className="mt-1 font-semibold text-bledi-blue">
                    {money(Number(l.pricePerNight))} / {t('common.night')}
                  </div>
                </Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Controles de trace */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap justify-center gap-2">
          {!drawing && !appliedPolygon && (
            <button
              onClick={startDrawing}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-bledi text-sm font-medium
                         text-charcoal hover:bg-cloud transition-colors"
            >
              <Pencil className="w-4 h-4" />
              {t('map.draw')}
            </button>
          )}

          {drawing && (
            <>
              <span className="bg-bledi-blue text-white px-4 py-2 rounded-full shadow-bledi text-sm">
                {t('map.drawing')} ({polygon.length})
              </span>
              <button
                onClick={finishDrawing}
                disabled={polygon.length < 3}
                className="flex items-center gap-2 bg-bledi-red text-white px-4 py-2 rounded-full shadow-bledi
                           text-sm font-medium disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {t('map.searchHere')}
              </button>
              <button
                onClick={clearArea}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-bledi text-sm text-charcoal"
              >
                <Trash2 className="w-4 h-4" />
                {t('map.clear')}
              </button>
            </>
          )}

          {appliedPolygon && !drawing && (
            <button
              onClick={clearArea}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-bledi text-sm
                         font-medium text-charcoal hover:bg-cloud transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('map.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Liste laterale */}
      <aside className="w-full lg:w-[420px] bg-cream border-s border-cloud overflow-y-auto">
        <div className="sticky top-0 bg-cream/95 backdrop-blur px-4 py-3 border-b border-cloud">
          <h1 className="font-display font-bold text-lg text-charcoal">{t('map.title')}</h1>
          <p className="text-sm text-slate">
            {loading ? t('common.loading') : `${items.length} ${t('map.results')}`}
          </p>
        </div>

        {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}

        <ul className="p-4 space-y-3">
          {items.map((l) => (
            <li key={l.id}>
              <Link
                href={`/logements/${l.slug || l.id}`}
                onMouseEnter={() => setHovered(l.id)}
                onMouseLeave={() => setHovered(null)}
                className={`flex gap-3 bg-white rounded-bledi p-3 shadow-bledi transition-all ${
                  hovered === l.id ? 'ring-2 ring-bledi-blue' : 'hover:shadow-bledi-hover'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoOf(l)}
                  alt={l.title}
                  className="w-24 h-24 object-cover rounded-bledi-sm shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-medium text-charcoal truncate">{l.title}</div>
                  <div className="text-xs text-slate mb-1">
                    {l.city}
                    {l.region ? `, ${l.region}` : ''}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate mb-1">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-bledi-gold fill-bledi-gold" />
                      {Number(l.avgRating ?? 0).toFixed(1)} ({l.totalReviews ?? 0})
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-bledi-blue" />
                      {l.trustScore}
                    </span>
                  </div>
                  <div className="font-semibold text-bledi-blue">
                    {money(Number(l.pricePerNight))}{' '}
                    <span className="text-xs font-normal text-slate">/ {t('common.night')}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {!loading && items.length === 0 && (
          <p className="px-4 pb-6 text-sm text-slate">
            Aucun logement ici. Deplacez la carte ou elargissez votre zone.
          </p>
        )}
      </aside>
    </div>
  );
}
