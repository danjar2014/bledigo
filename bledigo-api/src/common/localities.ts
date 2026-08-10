/**
 * Referentiel des localites tunisiennes.
 *
 * Annonces et demandes de location referencent la meme liste : c est ce qui
 * rend le rapprochement fiable. Une saisie libre produisait « Djerba »,
 * « Jerba », « Ile de Djerba »... et le perimetre du proprietaire ne
 * correspondait plus.
 *
 * `region` reprend le gouvernorat, unite administrative officielle.
 */

export interface Locality {
  /** Identifiant stable, utilise dans les URL et les comparaisons. */
  slug: string;
  /** Libelle affiche et stocke dans Listing.city / ReverseSearch.city. */
  name: string;
  /** Gouvernorat, stocke dans Listing.region / ReverseSearch.region. */
  region: string;
  lat: number;
  lng: number;
  /** Graphies alternatives acceptees a la saisie ou a la reprise de donnees. */
  aliases?: string[];
}

export const LOCALITIES: Locality[] = [
  // --- Grand Tunis ---
  { slug: 'tunis', name: 'Tunis', region: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { slug: 'la-marsa', name: 'La Marsa', region: 'Tunis', lat: 36.8783, lng: 10.3247, aliases: ['marsa'] },
  { slug: 'sidi-bou-said', name: 'Sidi Bou Said', region: 'Tunis', lat: 36.8708, lng: 10.3417 },
  { slug: 'carthage', name: 'Carthage', region: 'Tunis', lat: 36.8528, lng: 10.3233 },
  { slug: 'gammarth', name: 'Gammarth', region: 'Tunis', lat: 36.9186, lng: 10.2889 },
  { slug: 'le-bardo', name: 'Le Bardo', region: 'Tunis', lat: 36.8092, lng: 10.1394, aliases: ['bardo'] },
  { slug: 'ariana', name: 'Ariana', region: 'Ariana', lat: 36.8625, lng: 10.1956 },
  { slug: 'raoued', name: 'Raoued', region: 'Ariana', lat: 36.9256, lng: 10.2033 },
  { slug: 'ben-arous', name: 'Ben Arous', region: 'Ben Arous', lat: 36.7533, lng: 10.2231 },
  { slug: 'hammam-lif', name: 'Hammam Lif', region: 'Ben Arous', lat: 36.7314, lng: 10.3403 },
  { slug: 'ezzahra', name: 'Ezzahra', region: 'Ben Arous', lat: 36.7419, lng: 10.3061 },
  { slug: 'manouba', name: 'Manouba', region: 'Manouba', lat: 36.8081, lng: 10.0972 },

  // --- Cap Bon (Nabeul) ---
  { slug: 'hammamet', name: 'Hammamet', region: 'Nabeul', lat: 36.4, lng: 10.6167 },
  { slug: 'nabeul', name: 'Nabeul', region: 'Nabeul', lat: 36.4513, lng: 10.7357 },
  { slug: 'kelibia', name: 'Kelibia', region: 'Nabeul', lat: 36.8478, lng: 11.0939 },
  { slug: 'korba', name: 'Korba', region: 'Nabeul', lat: 36.5731, lng: 10.8592 },
  { slug: 'el-haouaria', name: 'El Haouaria', region: 'Nabeul', lat: 37.0506, lng: 11.0097, aliases: ['haouaria'] },
  { slug: 'menzel-temime', name: 'Menzel Temime', region: 'Nabeul', lat: 36.7811, lng: 10.9856 },
  { slug: 'soliman', name: 'Soliman', region: 'Nabeul', lat: 36.6969, lng: 10.4922 },

  // --- Nord ---
  { slug: 'bizerte', name: 'Bizerte', region: 'Bizerte', lat: 37.2746, lng: 9.8739 },
  { slug: 'ghar-el-melh', name: 'Ghar El Melh', region: 'Bizerte', lat: 37.1667, lng: 10.1897 },
  { slug: 'ras-jebel', name: 'Ras Jebel', region: 'Bizerte', lat: 37.2153, lng: 10.1189 },
  { slug: 'tabarka', name: 'Tabarka', region: 'Jendouba', lat: 36.9544, lng: 8.7581 },
  { slug: 'ain-draham', name: 'Ain Draham', region: 'Jendouba', lat: 36.7783, lng: 8.6892 },
  { slug: 'jendouba', name: 'Jendouba', region: 'Jendouba', lat: 36.5011, lng: 8.7803 },
  { slug: 'beja', name: 'Beja', region: 'Beja', lat: 36.7256, lng: 9.1817, aliases: ['béja'] },
  { slug: 'le-kef', name: 'Le Kef', region: 'Le Kef', lat: 36.1822, lng: 8.7147, aliases: ['kef'] },
  { slug: 'siliana', name: 'Siliana', region: 'Siliana', lat: 36.0844, lng: 9.3708 },
  { slug: 'zaghouan', name: 'Zaghouan', region: 'Zaghouan', lat: 36.4028, lng: 10.1425 },
  { slug: 'dougga', name: 'Dougga', region: 'Beja', lat: 36.4228, lng: 9.2181 },

  // --- Sahel ---
  { slug: 'sousse', name: 'Sousse', region: 'Sousse', lat: 35.8256, lng: 10.6084 },
  { slug: 'port-el-kantaoui', name: 'Port El Kantaoui', region: 'Sousse', lat: 35.8925, lng: 10.5953, aliases: ['kantaoui'] },
  { slug: 'hergla', name: 'Hergla', region: 'Sousse', lat: 36.0303, lng: 10.5083 },
  { slug: 'monastir', name: 'Monastir', region: 'Monastir', lat: 35.7643, lng: 10.8113 },
  { slug: 'skanes', name: 'Skanes', region: 'Monastir', lat: 35.7692, lng: 10.7539 },
  { slug: 'mahdia', name: 'Mahdia', region: 'Mahdia', lat: 35.5047, lng: 11.0622 },
  { slug: 'chebba', name: 'Chebba', region: 'Mahdia', lat: 35.2372, lng: 11.115 },
  { slug: 'sfax', name: 'Sfax', region: 'Sfax', lat: 34.7406, lng: 10.7603 },
  { slug: 'kerkennah', name: 'Kerkennah', region: 'Sfax', lat: 34.6864, lng: 11.1725, aliases: ['iles kerkennah'] },
  { slug: 'kairouan', name: 'Kairouan', region: 'Kairouan', lat: 35.6781, lng: 10.0964 },

  // --- Centre ---
  { slug: 'kasserine', name: 'Kasserine', region: 'Kasserine', lat: 35.1676, lng: 8.8365 },
  { slug: 'sidi-bouzid', name: 'Sidi Bouzid', region: 'Sidi Bouzid', lat: 35.0381, lng: 9.4858 },
  { slug: 'el-jem', name: 'El Jem', region: 'Mahdia', lat: 35.2969, lng: 10.7128, aliases: ['eljem'] },

  // --- Sud-est ---
  { slug: 'djerba', name: 'Djerba', region: 'Medenine', lat: 33.8076, lng: 10.8451, aliases: ['jerba', 'houmt souk', 'midoun'] },
  { slug: 'zarzis', name: 'Zarzis', region: 'Medenine', lat: 33.5039, lng: 11.1122 },
  { slug: 'medenine', name: 'Medenine', region: 'Medenine', lat: 33.3547, lng: 10.5053, aliases: ['médenine'] },
  { slug: 'ben-gardane', name: 'Ben Gardane', region: 'Medenine', lat: 33.1386, lng: 11.2178 },
  { slug: 'tataouine', name: 'Tataouine', region: 'Tataouine', lat: 32.9297, lng: 10.4518 },
  { slug: 'gabes', name: 'Gabes', region: 'Gabes', lat: 33.8815, lng: 10.0982, aliases: ['gabès'] },
  { slug: 'matmata', name: 'Matmata', region: 'Gabes', lat: 33.5442, lng: 9.9714 },

  // --- Sud-ouest ---
  { slug: 'tozeur', name: 'Tozeur', region: 'Tozeur', lat: 33.9197, lng: 8.1335 },
  { slug: 'nefta', name: 'Nefta', region: 'Tozeur', lat: 33.8731, lng: 7.8775 },
  { slug: 'douz', name: 'Douz', region: 'Kebili', lat: 33.4664, lng: 9.0203 },
  { slug: 'kebili', name: 'Kebili', region: 'Kebili', lat: 33.7044, lng: 8.9689, aliases: ['kébili'] },
  { slug: 'gafsa', name: 'Gafsa', region: 'Gafsa', lat: 34.425, lng: 8.7842 },
];

/** Normalise pour comparaison : minuscules, sans accent ni ponctuation. */
export function normalizeLocality(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Index construit une fois : nom, slug et alias pointent vers la localite. */
const INDEX: Map<string, Locality> = (() => {
  const map = new Map<string, Locality>();
  for (const loc of LOCALITIES) {
    map.set(normalizeLocality(loc.slug), loc);
    map.set(normalizeLocality(loc.name), loc);
    for (const alias of loc.aliases ?? []) map.set(normalizeLocality(alias), loc);
  }
  return map;
})();

/** Retrouve une localite par slug, nom ou alias. */
export function findLocality(value: unknown): Locality | null {
  const key = normalizeLocality(value);
  if (!key) return null;
  return INDEX.get(key) ?? null;
}

/**
 * Resolution tolerante, utilisee pour reprendre des donnees existantes :
 * essaie la correspondance exacte, puis cherche une localite citee dans le
 * texte (« une semaine a Djerba en famille »).
 */
export function resolveLocality(value: unknown): Locality | null {
  const exact = findLocality(value);
  if (exact) return exact;

  const text = normalizeLocality(value);
  if (!text) return null;

  // La plus longue correspondance gagne : « la marsa » plutot que « marsa »
  let best: Locality | null = null;
  let bestLength = 0;
  for (const [key, loc] of INDEX) {
    if (key.length > bestLength && text.includes(key)) {
      best = loc;
      bestLength = key.length;
    }
  }
  return best;
}

/** Gouvernorats presents dans le referentiel, tries. */
export function regions(): string[] {
  return [...new Set(LOCALITIES.map((l) => l.region))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Localites groupees par gouvernorat, pour alimenter un selecteur. */
export function localitiesByRegion(): { region: string; items: Locality[] }[] {
  return regions().map((region) => ({
    region,
    items: LOCALITIES.filter((l) => l.region === region).sort((a, b) =>
      a.name.localeCompare(b.name, 'fr'),
    ),
  }));
}
