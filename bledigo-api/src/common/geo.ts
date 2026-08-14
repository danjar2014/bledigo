/**
 * Distance a vol d oiseau entre deux points, en kilometres (Haversine).
 *
 * Extrait ici parce que trois endroits en avaient besoin : la recherche de
 * logements, la carte, et maintenant la proximite des prestataires. Une
 * troisieme copie aurait garanti qu une correction n en atteigne que deux.
 *
 * Suffisant a l echelle de la Tunisie : l erreur due a l aplatissement
 * terrestre reste sous le pourcent, tres en deca de la precision d une adresse
 * saisie a la main.
 */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
