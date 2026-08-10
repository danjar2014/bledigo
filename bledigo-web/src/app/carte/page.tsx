'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui';

// Leaflet manipule window : le composant ne doit pas etre rendu cote serveur.
const MapSearch = dynamic(() => import('@/components/MapSearch'), {
  ssr: false,
  loading: () => <Spinner label="Chargement de la carte..." />,
});

function MapPageInner() {
  const params = useSearchParams();
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const zoom = Number(params.get('zoom'));

  const center =
    Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : null;

  return <MapSearch initialCenter={center} initialZoom={Number.isFinite(zoom) && zoom ? zoom : undefined} />;
}

export default function MapPage() {
  return (
    <Suspense fallback={<Spinner label="Chargement de la carte..." />}>
      <MapPageInner />
    </Suspense>
  );
}
