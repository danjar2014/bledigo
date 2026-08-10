/**
 * Perimetre geographique d un proprietaire.
 *
 * Un proprietaire ne voit que les demandes de location correspondant a la zone
 * ou il possede reellement un bien : inutile de proposer une villa de Djerba a
 * un voyageur qui cherche a Tunis.
 *
 * La correspondance se fait sur la region et la ville. La demande porte des
 * champs libres (`destination`) que le voyageur saisit lui-meme : on les
 * compare donc de maniere tolerante (sans accent, sans casse).
 */

export interface OwnerZone {
  regions: Set<string>;
  cities: Set<string>;
}

export interface ZonedSearch {
  region?: string | null;
  city?: string | null;
  destination?: string | null;
}

/** Normalise pour comparaison : minuscules, sans accent, sans ponctuation. */
export function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Construit le perimetre a partir des annonces du proprietaire. */
export function buildOwnerZone(
  listings: { city?: string | null; region?: string | null }[],
): OwnerZone {
  const regions = new Set<string>();
  const cities = new Set<string>();
  for (const l of listings) {
    const r = normalize(l.region);
    const c = normalize(l.city);
    if (r) regions.add(r);
    if (c) cities.add(c);
  }
  return { regions, cities };
}

/**
 * `region` : le proprietaire voit toute sa region (defaut).
 * `city`   : uniquement les villes ou il possede un bien.
 */
export type ZoneScope = 'region' | 'city';

/** Vrai si la demande tombe dans le perimetre du proprietaire. */
export function matchesZone(
  search: ZonedSearch,
  zone: OwnerZone,
  scope: ZoneScope = 'region',
): boolean {
  const searchCity = normalize(search.city);
  const searchRegion = normalize(search.region);
  const destination = normalize(search.destination);

  // Correspondance ville : champ dedie, ou ville citee dans la destination libre
  const cityMatch =
    (searchCity && zone.cities.has(searchCity)) ||
    (destination && [...zone.cities].some((c) => c && destination.includes(c)));

  if (scope === 'city') return Boolean(cityMatch);

  const regionMatch =
    (searchRegion && zone.regions.has(searchRegion)) ||
    (destination && [...zone.regions].some((r) => r && destination.includes(r)));

  return Boolean(cityMatch || regionMatch);
}

/** Filtre une liste de demandes sur le perimetre du proprietaire. */
export function filterByZone<T extends ZonedSearch>(
  searches: T[],
  zone: OwnerZone,
  scope: ZoneScope = 'region',
): T[] {
  if (zone.regions.size === 0 && zone.cities.size === 0) return [];
  return searches.filter((s) => matchesZone(s, zone, scope));
}
