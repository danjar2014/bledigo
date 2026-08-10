/**
 * Referentiel partage des caracteristiques de logement.
 * Utilise par le formulaire de publication, la fiche logement et les filtres
 * de recherche : une seule source de verite evite les libelles divergents.
 */

export interface CatalogItem {
  key: string;
  label: string;
  /** Nom d icone lucide-react, resolu par le composant AmenityIcon. */
  icon: string;
  /** Mis en avant dans les filtres de recherche. */
  featured?: boolean;
}

export interface CatalogGroup {
  key: string;
  label: string;
  items: CatalogItem[];
}

export const AMENITY_GROUPS: CatalogGroup[] = [
  {
    key: 'essentials',
    label: 'Essentiels',
    items: [
      { key: 'wifi', label: 'Wi-Fi', icon: 'Wifi', featured: true },
      { key: 'kitchen', label: 'Cuisine equipee', icon: 'CookingPot', featured: true },
      { key: 'air_conditioning', label: 'Climatisation', icon: 'Snowflake', featured: true },
      { key: 'heating', label: 'Chauffage', icon: 'Flame' },
      { key: 'hot_water', label: 'Eau chaude', icon: 'Droplets' },
      { key: 'washer', label: 'Lave-linge', icon: 'WashingMachine', featured: true },
      { key: 'dryer', label: 'Seche-linge', icon: 'Wind' },
      { key: 'iron', label: 'Fer a repasser', icon: 'Shirt' },
      { key: 'hairdryer', label: 'Seche-cheveux', icon: 'Sparkles' },
      { key: 'linens', label: 'Draps et serviettes', icon: 'BedDouble' },
      { key: 'workspace', label: 'Espace de travail', icon: 'Laptop' },
      { key: 'tv', label: 'Television', icon: 'Tv', featured: true },
    ],
  },
  {
    key: 'outdoor',
    label: 'Exterieur et vue',
    items: [
      { key: 'pool', label: 'Piscine', icon: 'Waves', featured: true },
      { key: 'pool_private', label: 'Piscine privee', icon: 'Waves' },
      { key: 'sea_view', label: 'Vue sur mer', icon: 'Sailboat', featured: true },
      { key: 'beach_access', label: 'Acces direct plage', icon: 'Umbrella', featured: true },
      { key: 'garden', label: 'Jardin', icon: 'Trees' },
      { key: 'terrace', label: 'Terrasse', icon: 'Sun', featured: true },
      { key: 'balcony', label: 'Balcon', icon: 'PanelTop' },
      { key: 'rooftop', label: 'Toit-terrasse', icon: 'Building' },
      { key: 'bbq', label: 'Barbecue', icon: 'Beef' },
      { key: 'outdoor_furniture', label: 'Mobilier de jardin', icon: 'Armchair' },
    ],
  },
  {
    key: 'comfort',
    label: 'Confort et loisirs',
    items: [
      { key: 'jacuzzi', label: 'Jacuzzi', icon: 'Bath' },
      { key: 'hammam', label: 'Hammam', icon: 'Droplet' },
      { key: 'gym', label: 'Salle de sport', icon: 'Dumbbell' },
      { key: 'fireplace', label: 'Cheminee', icon: 'Flame' },
      { key: 'game_console', label: 'Console de jeux', icon: 'Gamepad2' },
      { key: 'books', label: 'Livres et jeux', icon: 'BookOpen' },
      { key: 'sound_system', label: 'Systeme audio', icon: 'Speaker' },
    ],
  },
  {
    key: 'services',
    label: 'Services',
    items: [
      { key: 'parking', label: 'Parking gratuit', icon: 'CircleParking', featured: true },
      { key: 'parking_paid', label: 'Parking payant', icon: 'CircleParking' },
      { key: 'elevator', label: 'Ascenseur', icon: 'MoveVertical' },
      { key: 'concierge', label: 'Conciergerie', icon: 'ConciergeBell' },
      { key: 'cleaning_included', label: 'Menage inclus', icon: 'SprayCan' },
      { key: 'breakfast', label: 'Petit-dejeuner', icon: 'Croissant' },
      { key: 'airport_shuttle', label: 'Navette aeroport', icon: 'Plane' },
      { key: 'self_checkin', label: 'Arrivee autonome', icon: 'KeyRound' },
    ],
  },
  {
    key: 'safety',
    label: 'Securite',
    items: [
      { key: 'smoke_alarm', label: 'Detecteur de fumee', icon: 'BellRing' },
      { key: 'fire_extinguisher', label: 'Extincteur', icon: 'FireExtinguisher' },
      { key: 'first_aid', label: 'Trousse de secours', icon: 'BriefcaseMedical' },
      { key: 'security_guard', label: 'Gardien', icon: 'ShieldCheck' },
      { key: 'cameras_exterior', label: 'Cameras exterieures', icon: 'Cctv' },
      { key: 'safe', label: 'Coffre-fort', icon: 'Lock' },
    ],
  },
  {
    key: 'accessibility',
    label: 'Accessibilite et famille',
    items: [
      { key: 'step_free', label: 'Acces de plain-pied', icon: 'Accessibility' },
      { key: 'wide_doorway', label: 'Portes larges', icon: 'DoorOpen' },
      { key: 'crib', label: 'Lit bebe', icon: 'Baby' },
      { key: 'high_chair', label: 'Chaise haute', icon: 'Armchair' },
      { key: 'child_safety', label: 'Securite enfants', icon: 'ShieldPlus' },
    ],
  },
];

export const ALL_AMENITIES: CatalogItem[] = AMENITY_GROUPS.flatMap((g) => g.items);

export const FEATURED_AMENITIES: CatalogItem[] = ALL_AMENITIES.filter((a) => a.featured);

export function amenityLabel(key: string): string {
  return ALL_AMENITIES.find((a) => a.key === key)?.label ?? key;
}

export function amenityIcon(key: string): string {
  return ALL_AMENITIES.find((a) => a.key === key)?.icon ?? 'Check';
}

/** Regles de la maison : chaque regle est autorisee, interdite ou non renseignee. */
export interface HouseRule {
  key: string;
  label: string;
  icon: string;
  /** Libelle quand la regle est refusee. */
  deniedLabel: string;
}

export const HOUSE_RULES: HouseRule[] = [
  { key: 'smoking', label: 'Fumeurs acceptes', deniedLabel: 'Non-fumeur', icon: 'Cigarette' },
  { key: 'pets', label: 'Animaux acceptes', deniedLabel: 'Animaux non admis', icon: 'PawPrint' },
  { key: 'parties', label: 'Fetes autorisees', deniedLabel: 'Fetes non autorisees', icon: 'PartyPopper' },
  { key: 'children', label: 'Enfants bienvenus', deniedLabel: 'Non adapte aux enfants', icon: 'Baby' },
  { key: 'unmarried', label: 'Couples non maries acceptes', deniedLabel: 'Acte de mariage demande', icon: 'HeartHandshake' },
  { key: 'long_stay', label: 'Sejours longue duree', deniedLabel: 'Courte duree uniquement', icon: 'CalendarRange' },
  { key: 'commercial_photo', label: 'Photo ou tournage autorise', deniedLabel: 'Tournage interdit', icon: 'Camera' },
];

export const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'villa', label: 'Villa' },
  { value: 'house', label: 'Maison' },
  { value: 'studio', label: 'Studio' },
  { value: 'riad', label: 'Riad' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'chalet', label: 'Chalet' },
];

export function propertyTypeLabel(value: string): string {
  return PROPERTY_TYPES.find((p) => p.value === value)?.label ?? value;
}

/** Ce que le voyageur trouve a proximite : sert au classement et au texte SEO. */
export const PROXIMITY = [
  { key: 'beach', label: 'Plage', icon: 'Umbrella' },
  { key: 'center', label: 'Centre-ville', icon: 'Building2' },
  { key: 'shops', label: 'Commerces', icon: 'ShoppingBag' },
  { key: 'restaurants', label: 'Restaurants', icon: 'UtensilsCrossed' },
  { key: 'transport', label: 'Transports', icon: 'TramFront' },
  { key: 'airport', label: 'Aeroport', icon: 'Plane' },
  { key: 'hospital', label: 'Hopital', icon: 'Cross' },
  { key: 'golf', label: 'Golf', icon: 'Flag' },
];
