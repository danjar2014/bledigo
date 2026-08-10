/**
 * Filtrage par equipements.
 *
 * Les equipements sont stockes en JSON (String sous sqlite, Json sous postgres).
 * Ni l un ni l autre ne permet un `array_contains` portable via Prisma ici :
 * le filtrage se fait donc en memoire apres la requete. Sous PostgreSQL en
 * production, remplacer par un operateur JSONB (`@>`) avec index GIN.
 */

export function parseAmenities(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
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

/** Normalise le parametre : "wifi,pool" ou ["wifi","pool"] -> ["wifi","pool"]. */
export function normalizeAmenityFilter(raw: unknown): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return list.map((a) => String(a).trim()).filter(Boolean);
}

/** Vrai si le logement possede TOUS les equipements demandes. */
export function hasAllAmenities(listing: { amenities?: unknown }, required: string[]): boolean {
  if (required.length === 0) return true;
  const owned = new Set(parseAmenities(listing.amenities));
  return required.every((a) => owned.has(a));
}

/** Filtre une liste de logements sur les equipements demandes. */
export function filterByAmenities<T extends { amenities?: unknown }>(
  items: T[],
  raw: unknown,
): T[] {
  const required = normalizeAmenityFilter(raw);
  if (required.length === 0) return items;
  return items.filter((l) => hasAllAmenities(l, required));
}
