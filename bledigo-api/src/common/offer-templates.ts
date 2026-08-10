/**
 * Messages standards des offres.
 *
 * Le message d une offre n est plus un texte libre : le proprietaire compose
 * son offre a partir de ce catalogue. C est la seule maniere fiable d empecher
 * la transmission de coordonnees (telephone, email, messagerie externe), qui
 * fait sortir la transaction de la plateforme et prive le voyageur de la
 * protection du paiement bloque.
 *
 * Un filtre par motifs ne suffirait pas : « zero zero deux un six... » ou
 * « mon prenom point nom arobase gmail » passent au travers.
 */

export interface OfferTemplate {
  key: string;
  /** Phrase inseree dans le message envoye au voyageur. */
  text: string;
  /** Regroupement pour l affichage. */
  group: string;
}

export const OFFER_TEMPLATES: OfferTemplate[] = [
  // --- Disponibilite ---
  { key: 'available_exact', group: 'Disponibilite', text: 'Le logement est disponible aux dates demandees.' },
  { key: 'available_flexible', group: 'Disponibilite', text: 'Je peux ajuster les dates de quelques jours si besoin.' },
  { key: 'last_slot', group: 'Disponibilite', text: 'Il s agit de mes dernieres disponibilites sur cette periode.' },

  // --- Le logement ---
  { key: 'matches_criteria', group: 'Le logement', text: 'Le logement correspond a tous les criteres de votre demande.' },
  { key: 'recently_renovated', group: 'Le logement', text: 'Le logement a ete renove recemment.' },
  { key: 'quiet_area', group: 'Le logement', text: 'Le quartier est calme et residentiel.' },
  { key: 'near_beach', group: 'Le logement', text: 'La plage est accessible a pied.' },
  { key: 'near_center', group: 'Le logement', text: 'Le centre-ville et les commerces sont a proximite.' },
  { key: 'parking_included', group: 'Le logement', text: 'Un parking prive est inclus.' },
  { key: 'photos_recent', group: 'Le logement', text: 'Les photos de l annonce sont recentes et conformes.' },

  // --- Conditions ---
  { key: 'price_negotiable', group: 'Conditions', text: 'Le tarif propose reste discutable pour un sejour plus long.' },
  { key: 'cleaning_included', group: 'Conditions', text: 'Le menage de fin de sejour est inclus dans le tarif.' },
  { key: 'linen_included', group: 'Conditions', text: 'Draps et serviettes sont fournis.' },
  { key: 'breakfast_included', group: 'Conditions', text: 'Le petit-dejeuner est offert.' },
  { key: 'flexible_checkin', group: 'Conditions', text: 'L heure d arrivee peut etre adaptee a votre trajet.' },
  { key: 'deposit_explained', group: 'Conditions', text: 'La caution est bloquee puis restituee integralement au depart.' },

  // --- Accueil ---
  { key: 'welcome_onsite', group: 'Accueil', text: 'Je vous accueille personnellement a votre arrivee.' },
  { key: 'caretaker_onsite', group: 'Accueil', text: 'Un gardien est present sur place en permanence.' },
  { key: 'help_transport', group: 'Accueil', text: 'Je peux vous orienter pour le transport depuis l aeroport.' },
  { key: 'available_questions', group: 'Accueil', text: 'Je reste disponible via la messagerie BlediGo pour vos questions.' },
];

const BY_KEY = new Map(OFFER_TEMPLATES.map((t) => [t.key, t]));

/** Nombre maximum de phrases par offre, pour garder un message lisible. */
export const MAX_TEMPLATES_PER_OFFER = 5;

/**
 * Compose le message a partir des cles choisies.
 * Toute cle inconnue est une tentative de contournement : on refuse.
 */
export function buildOfferMessage(keys: unknown): { message: string; keys: string[] } {
  const list = Array.isArray(keys) ? keys : keys ? [keys] : [];
  const clean = list.map((k) => String(k).trim()).filter(Boolean);

  if (clean.length === 0) {
    return { message: '', keys: [] };
  }
  if (clean.length > MAX_TEMPLATES_PER_OFFER) {
    throw new Error(`Choisissez au maximum ${MAX_TEMPLATES_PER_OFFER} messages.`);
  }

  const unknown = clean.filter((k) => !BY_KEY.has(k));
  if (unknown.length > 0) {
    throw new Error(`Message non reconnu : ${unknown.join(', ')}`);
  }

  // On conserve l ordre du catalogue : le message reste coherent
  const ordered = OFFER_TEMPLATES.filter((t) => clean.includes(t.key));
  return { message: ordered.map((t) => t.text).join(' '), keys: ordered.map((t) => t.key) };
}

/** Catalogue groupe, pour alimenter le formulaire. */
export function templatesByGroup(): { group: string; items: OfferTemplate[] }[] {
  const groups = [...new Set(OFFER_TEMPLATES.map((t) => t.group))];
  return groups.map((group) => ({
    group,
    items: OFFER_TEMPLATES.filter((t) => t.group === group),
  }));
}
