/**
 * Client HTTP de l API BlediGo.
 * Le token d acces est injecte automatiquement et rafraichi via /auth/refresh.
 */
/**
 * Render injecte l hote sans protocole (« bledigo-api.onrender.com ») quand la
 * variable provient d un autre service. On complete donc en https, tout en
 * laissant passer une URL deja formee et le http local.
 */
function normalizeApiUrl(raw?: string): string {
  const value = (raw || '').trim();
  if (!value) return 'http://localhost:4000';
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, '');
  return `https://${value.replace(/\/+$/, '')}`;
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Tokens = { accessToken: string; refreshToken: string };

/** Une ligne de la cloche. Le champ `link` pointe vers la page de l evenement. */
export type NotificationItem = {
  id: string;
  type:
    | 'offer_received'
    | 'counter_answered'
    | 'counter_to_answer'
    | 'booking_to_confirm'
    | 'booking_confirmed'
    | 'booking_cancelled';
  audience: 'traveler' | 'owner';
  title: string;
  body: string;
  link: string;
  actionRequired: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'bledigo.auth';

export function readTokens(): Tokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: Tokens | null) {
  if (typeof window === 'undefined') return;
  if (tokens) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  else window.localStorage.removeItem(STORAGE_KEY);
}

async function parse(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean; retry?: boolean } = {},
): Promise<T> {
  const { auth = false, retry = true, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const tokens = readTokens();
  if (auth && tokens) headers.set('Authorization', `Bearer ${tokens.accessToken}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });

  // Token expire : on tente un refresh une seule fois
  if (res.status === 401 && auth && retry && tokens?.refreshToken) {
    const refreshed = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (refreshed.ok) {
      writeTokens((await refreshed.json()) as Tokens);
      return request<T>(path, { ...options, retry: false });
    }
    writeTokens(null);
  }

  const data = await parse(res);
  if (!res.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message || `Erreur ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

const body = (data: unknown) => JSON.stringify(data);

export const api = {
  // --- auth ---
  register: (dto: any) => request<any>('/api/v1/auth/register', { method: 'POST', body: body(dto) }),
  login: (dto: any) => request<any>('/api/v1/auth/login', { method: 'POST', body: body(dto) }),
  me: () => request<any>('/api/v1/auth/me', { auth: true }),
  /** Connexion Google : le jeton d identite est verifie cote serveur. */
  googleLogin: (credential: string) =>
    request<{ user: any; accessToken: string; refreshToken: string }>('/api/v1/auth/google', {
      method: 'POST',
      body: body({ credential }),
    }),

  // --- roles du compte courant ---
  myRoles: () => request<any>('/api/v1/users/me/roles', { auth: true }),
  /** Active un second role : proprietaire qui veut aussi voyager, ou l inverse. */
  enableRole: (role: 'traveler' | 'owner') =>
    request<any>('/api/v1/users/me/roles', { method: 'POST', auth: true, body: body({ role }) }),

  // --- notifications ---
  /** Alimente la cloche : ce qui attend une action, pour les deux casquettes. */
  notificationFeed: () =>
    request<{ items: NotificationItem[]; actionCount: number }>('/api/v1/notifications/feed', {
      auth: true,
    }),

  // --- annonces ---
  listings: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/listings?${new URLSearchParams(clean(params))}`),
  listing: (id: string) => request<any>(`/api/v1/listings/${id}`),
  /** Mes annonces, brouillons et re-verifications compris. */
  myListings: () => request<any[]>('/api/v1/listings/mine', { auth: true }),
  availability: (id: string) => request<any>(`/api/v1/listings/${id}/availability`),
  /** Periodes du calendrier : fermetures, tarifs saisonniers, sejours minimums. */
  calendrier: (id: string) => request<any[]>(`/api/v1/listings/${id}/calendrier`),
  ajouterPeriode: (id: string, dto: any) =>
    request<any>(`/api/v1/listings/${id}/calendrier`, { method: 'POST', auth: true, body: body(dto) }),
  supprimerPeriode: (id: string, periodeId: string) =>
    request<any>(`/api/v1/listings/${id}/calendrier/${periodeId}`, { method: 'DELETE', auth: true }),
  /** Prix d un sejour, tarifs saisonniers appliques nuit par nuit. */
  tarifSejour: (id: string, checkIn: string, checkOut: string) =>
    request<{ nuits: number; basePrice: number; minNights: number; prixMoyen: number }>(
      `/api/v1/listings/${id}/tarif?${new URLSearchParams({ checkIn, checkOut })}`,
    ),
  createListing: (dto: any) =>
    request<any>('/api/v1/listings', { method: 'POST', auth: true, body: body(dto) }),
  publishListing: (id: string) =>
    request<any>(`/api/v1/listings/${id}/publish`, { method: 'POST', auth: true }),
  addPhoto: (id: string, dto: any) =>
    request<any>(`/api/v1/listings/${id}/photos`, { method: 'POST', auth: true, body: body(dto) }),
  updateListing: (id: string, dto: any) =>
    request<any>(`/api/v1/listings/${id}`, { method: 'PATCH', auth: true, body: body(dto) }),
  listingModifications: (id: string) =>
    request<any[]>(`/api/v1/listings/${id}/modifications`, { auth: true }),

  // --- recherche ---
  search: (params: Record<string, any>) =>
    request<any>(`/api/v1/search?${new URLSearchParams(clean(params))}`),
  suggestions: (q: string) => request<any>(`/api/v1/search/suggestions?q=${encodeURIComponent(q)}`),

  // --- villes & types de biens ---
  cities: (limit?: number) =>
    request<any[]>(`/api/v1/cities${limit ? `?limit=${limit}` : ''}`),
  city: (slug: string, params: Record<string, any> = {}) =>
    request<any>(`/api/v1/cities/${slug}?${new URLSearchParams(clean(params))}`),
  propertyTypes: () => request<any[]>('/api/v1/property-types'),
  /** Referentiel des localites, groupees par gouvernorat. */
  /**
   * Referentiel des localites.
   *
   * Sans `flat`, l API renvoie des GROUPES par region — { region, items[] } —
   * et non des villes. Confondre les deux formes donne des `undefined`
   * silencieux, ou une exception a la premiere lecture de `.name`.
   */
  localities: (flat = false) =>
    request<any[]>(`/api/v1/localities${flat ? '?flat=1' : ''}`),

  // --- carte ---
  /** Annonces dans une bounding box ou dans un polygone tracé. */
  mapListings: (params: Record<string, any>) =>
    request<any>(`/api/v1/map/listings?${new URLSearchParams(clean(params))}`),

  // --- reservations ---
  createBooking: (dto: any) =>
    request<any>('/api/v1/bookings', { method: 'POST', auth: true, body: body(dto) }),
  bookings: (as: 'traveler' | 'owner') => request<any[]>(`/api/v1/bookings?as=${as}`, { auth: true }),
  booking: (id: string) => request<any>(`/api/v1/bookings/${id}`, { auth: true }),
  confirmBooking: (id: string) =>
    request<any>(`/api/v1/bookings/${id}/confirm`, { method: 'POST', auth: true }),
  cancelBooking: (id: string) =>
    request<any>(`/api/v1/bookings/${id}/cancel`, { method: 'POST', auth: true }),
  checkIn: (id: string) =>
    request<any>(`/api/v1/bookings/${id}/check-in`, { method: 'POST', auth: true }),
  validateStay: (id: string, dto: any) =>
    request<any>(`/api/v1/bookings/${id}/validate`, { method: 'POST', auth: true, body: body(dto) }),
  /** Refus a l arrivee : annule la reservation et rembourse, sans arbitrage. */
  refuseStay: (id: string, dto: any) =>
    request<{ booking: any; refunded: boolean; motifs: string[] }>(
      `/api/v1/bookings/${id}/refuse`,
      { method: 'POST', auth: true, body: body(dto) },
    ),

  // --- extension d un sejour ---
  /** Devis servi AVANT la demande : le voyageur voit le prix avant de s engager. */
  extensionQuote: (id: string, checkOut: string) =>
    request<{
      checkOutActuel: string;
      checkOutDemande: string;
      nuitsAjoutees: number;
      prix: number;
      prixMoyenParNuit: number;
      totalApresExtension: number;
      currency: string;
      accordRequis: boolean;
    }>(`/api/v1/bookings/${id}/extension?checkOut=${encodeURIComponent(checkOut)}`, { auth: true }),
  requestExtension: (id: string, checkOut: string) =>
    request<{ applique: boolean; booking: any; devis: any }>(`/api/v1/bookings/${id}/extension`, {
      method: 'POST',
      auth: true,
      body: body({ checkOut }),
    }),
  acceptExtension: (id: string) =>
    request<any>(`/api/v1/bookings/${id}/extension/accept`, { method: 'POST', auth: true }),
  refuseExtension: (id: string) =>
    request<any>(`/api/v1/bookings/${id}/extension/refuse`, { method: 'POST', auth: true }),

  // --- paiements ---
  payIntent: (bookingId: string) =>
    request<any>('/api/v1/payments/intent', { method: 'POST', auth: true, body: body({ bookingId }) }),
  payment: (bookingId: string) => request<any>(`/api/v1/payments/booking/${bookingId}`, { auth: true }),

  // --- assurance ---
  insuranceQuotes: (bookingId: string) => request<any[]>(`/api/v1/insurance/booking/${bookingId}/quotes`),
  subscribeInsurance: (bookingId: string, type: string) =>
    request<any>(`/api/v1/insurance/booking/${bookingId}`, {
      method: 'POST',
      auth: true,
      body: body({ type }),
    }),

  // --- avis ---
  reviews: (listingId: string) => request<any>(`/api/v1/reviews/listing/${listingId}`),
  listingReviews: (listingId: string, params: Record<string, any> = {}) =>
    request<any>(`/api/v1/listings/${listingId}/reviews?${new URLSearchParams(clean(params))}`),
  createReview: (dto: any) =>
    request<any>('/api/v1/reviews', { method: 'POST', auth: true, body: body(dto) }),
  markReviewHelpful: (id: string) =>
    request<any>(`/api/v1/reviews/${id}/helpful`, { method: 'POST', auth: true }),
  flagReview: (id: string, reason: string) =>
    request<any>(`/api/v1/reviews/${id}/flag`, { method: 'POST', auth: true, body: body({ reason }) }),

  // --- litiges ---
  createDispute: (dto: any) =>
    request<any>('/api/v1/disputes', { method: 'POST', auth: true, body: body(dto) }),
  disputes: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/disputes?${new URLSearchParams(clean(params))}`, { auth: true }),
  dispute: (id: string) => request<any>(`/api/v1/disputes/${id}`, { auth: true }),
  decideDispute: (id: string, dto: any) =>
    request<any>(`/api/v1/disputes/${id}/decide`, { method: 'POST', auth: true, body: body(dto) }),

  // --- messagerie ---
  conversations: () => request<any[]>('/api/v1/conversations', { auth: true }),
  createConversation: (dto: any) =>
    request<any>('/api/v1/conversations', { method: 'POST', auth: true, body: body(dto) }),
  messages: (id: string) => request<any[]>(`/api/v1/conversations/${id}/messages`, { auth: true }),
  sendMessage: (id: string, content: string) =>
    request<any>(`/api/v1/conversations/${id}/messages`, {
      method: 'POST',
      auth: true,
      body: body({ content }),
    }),

  // --- recherche inversee ---
  /** Mes demandes : il n existe pas de liste publique. */
  reverseSearches: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/reverse-searches?${new URLSearchParams(clean(params))}`, { auth: true }),
  reverseSearch: (id: string) => request<any>(`/api/v1/reverse-searches/${id}`, { auth: true }),
  createReverseSearch: (dto: any) =>
    request<any>('/api/v1/reverse-searches', { method: 'POST', auth: true, body: body(dto) }),
  updateReverseSearch: (id: string, dto: any) =>
    request<any>(`/api/v1/reverse-searches/${id}`, { method: 'PATCH', auth: true, body: body(dto) }),
  cancelReverseSearch: (id: string) =>
    request<any>(`/api/v1/reverse-searches/${id}`, { method: 'DELETE', auth: true }),
  makeOffer: (id: string, dto: any) =>
    request<any>(`/api/v1/reverse-searches/${id}/offers`, { method: 'POST', auth: true, body: body(dto) }),
  /** Messages standards : seule source acceptee pour le message d une offre. */
  offerTemplates: () => request<any[]>('/api/v1/reverse-searches/offer-templates'),
  /** Ouvre une demande : 1 credit, une seule fois. La liste reste gratuite. */
  unlockReverseSearch: (id: string) =>
    request<any>(`/api/v1/reverse-searches/${id}/unlock`, { method: 'POST', auth: true }),
  /** Voyageur : mes recherches publiees */
  myReverseSearches: () => request<any[]>('/api/v1/reverse-searches/my-searches', { auth: true }),
  /** Voyageur : offres recues (tri + filtres) */
  reverseOffers: (id: string, params: Record<string, any> = {}) =>
    request<any>(`/api/v1/reverse-searches/${id}/offers?${new URLSearchParams(clean(params))}`, {
      auth: true,
    }),
  acceptReverseOffer: (id: string, offerId: string) =>
    request<any>(`/api/v1/reverse-searches/${id}/offers/${offerId}/accept`, {
      method: 'POST',
      auth: true,
    }),
  /** Voyageur : refuse une offre. */
  rejectReverseOffer: (offerId: string) =>
    request<any>(`/api/v1/reverse-searches/offers/${offerId}/reject`, {
      method: 'POST',
      auth: true,
    }),
  /** Voyageur : propose un autre montant ; la main passe a l hote. */
  counterReverseOffer: (offerId: string, price: number) =>
    request<any>(`/api/v1/reverse-searches/offers/${offerId}/counter`, {
      method: 'POST',
      auth: true,
      body: body({ price }),
    }),
  /** Hote : contre-propositions en attente de sa reponse. */
  pendingCounters: () =>
    request<any[]>('/api/v1/reverse-searches/offers/pending-counters', { auth: true }),
  /** Hote : accepte, refuse ou propose un compromis. */
  respondToCounter: (offerId: string, action: 'accept' | 'reject' | 'counter', price?: number) =>
    request<any>(`/api/v1/reverse-searches/offers/${offerId}/respond`, {
      method: 'POST',
      auth: true,
      body: body({ action, price }),
    }),
  /** Proprietaire : demandes disponibles (consomme 1 credit) */
  availableReverseSearches: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/reverse-searches/available?${new URLSearchParams(clean(params))}`, {
      auth: true,
    }),

  // --- credits recherche inversee ---
  reverseSearchCredits: () => request<any>('/api/v1/reverse-searches/credits', { auth: true }),
  purchaseReverseSearchCredits: (packageType: string) =>
    request<any>('/api/v1/reverse-searches/credits/purchase', {
      method: 'POST',
      auth: true,
      body: body({ packageType }),
    }),

  // --- ia ---
  scoreListing: (id: string) =>
    request<any>(`/api/v1/ai/listings/${id}/score`, { method: 'POST', auth: true }),
  fraudCheck: (id: string) => request<any>(`/api/v1/ai/listings/${id}/fraud`, { auth: true }),
  priceSuggestion: (params: Record<string, any>) =>
    request<any>(`/api/v1/ai/price-suggestion?${new URLSearchParams(clean(params))}`),

  // --- abonnements ---
  plans: () => request<any[]>('/api/v1/subscriptions/plans'),
  mySubscriptions: () => request<any[]>('/api/v1/subscriptions', { auth: true }),
  subscribe: (type: string) =>
    request<any>('/api/v1/subscriptions', { method: 'POST', auth: true, body: body({ type }) }),

  // --- admin ---
  dashboard: () => request<any>('/api/v1/admin/dashboard', { auth: true }),
  auditLogs: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/admin/audit-logs?${new URLSearchParams(clean(params))}`, { auth: true }),
  moderateListing: (id: string, status: string) =>
    request<any>(`/api/v1/admin/listings/${id}/status`, {
      method: 'PATCH',
      auth: true,
      body: body({ status }),
    }),
  certify: (id: string, level: string) =>
    request<any>(`/api/v1/admin/listings/${id}/certify`, {
      method: 'POST',
      auth: true,
      body: body({ level }),
    }),
  sanction: (dto: any) =>
    request<any>('/api/v1/admin/sanctions', { method: 'POST', auth: true, body: body(dto) }),
  /** Sanctions en vigueur, avec le nombre de sejours restant a honorer. */
  activeSanctions: () => request<any[]>('/api/v1/admin/sanctions', { auth: true }),
  revokeSanction: (id: string) =>
    request<{ revoked: boolean; compteReactive: boolean; sanctionsRestantes: number }>(
      `/api/v1/admin/sanctions/${id}/revoke`,
      { method: 'POST', auth: true },
    ),
  /** Versements immobilises par une mesure conservatoire. */
  heldPayments: () => request<any[]>('/api/v1/admin/payments/held', { auth: true }),
  settlePayment: (id: string, decision: 'release' | 'refund', motif?: string) =>
    request<any>(`/api/v1/admin/payments/${id}/settle`, {
      method: 'POST',
      auth: true,
      body: body({ decision, motif }),
    }),
  users: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/users?${new URLSearchParams(clean(params))}`),

  // ------------------------------------------------------------- Prestataires
  /**
   * Candidature publique, sans authentification : une agence n a evidemment pas
   * de compte avant d en demander un. La reponse ne contient aucun identifiant —
   * ils sont transmis par telephone apres verification.
   */
  applyAsProvider: (dto: any) =>
    request<{ recue: boolean; message: string }>('/api/v1/prestataires/candidature', {
      method: 'POST',
      body: body(dto),
    }),

  //
  // Espace du prestataire connecte. Le compte est cree par l administration
  // apres constatation du statut d agence : il n existe aucune inscription
  // libre a appeler ici.
  providerMe: () => request<any>('/api/v1/prestataire/moi', { auth: true }),
  providerUpdate: (dto: any) =>
    request<any>('/api/v1/prestataire/moi', { method: 'PATCH', auth: true, body: body(dto) }),
  providerFleet: () => request<any[]>('/api/v1/prestataire/vehicules', { auth: true }),
  providerAddVehicle: (dto: any) =>
    request<any>('/api/v1/prestataire/vehicules', { method: 'POST', auth: true, body: body(dto) }),
  providerUpdateVehicle: (id: string, dto: any) =>
    request<any>(`/api/v1/prestataire/vehicules/${id}`, {
      method: 'PATCH',
      auth: true,
      body: body(dto),
    }),
  providerRemoveVehicle: (id: string) =>
    request<any>(`/api/v1/prestataire/vehicules/${id}`, { method: 'DELETE', auth: true }),
  providerVehicleCalendar: (id: string) =>
    request<any[]>(`/api/v1/prestataire/vehicules/${id}/calendrier`, { auth: true }),
  providerAddPeriod: (id: string, dto: any) =>
    request<any>(`/api/v1/prestataire/vehicules/${id}/calendrier`, {
      method: 'POST',
      auth: true,
      body: body(dto),
    }),
  providerRemovePeriod: (id: string, periodeId: string) =>
    request<any>(`/api/v1/prestataire/vehicules/${id}/calendrier/${periodeId}`, {
      method: 'DELETE',
      auth: true,
    }),
  providerRequests: () => request<any[]>('/api/v1/prestataire/demandes', { auth: true }),
  providerAccept: (id: string) =>
    request<any>(`/api/v1/prestataire/demandes/${id}/accepter`, { method: 'POST', auth: true }),
  providerRefuse: (id: string, motif?: string) =>
    request<any>(`/api/v1/prestataire/demandes/${id}/refuser`, {
      method: 'POST',
      auth: true,
      body: body({ motif }),
    }),

  // ----------------------------------------------------------------- Services
  /** Vehicules proposables pour un sejour deja accepte. */
  carsForBooking: (bookingId: string) =>
    request<any>(`/api/v1/services/voitures/pour-sejour/${bookingId}`, { auth: true }),
  requestCar: (bookingId: string, dto: any) =>
    request<any>(`/api/v1/services/voitures/pour-sejour/${bookingId}`, {
      method: 'POST',
      auth: true,
      body: body(dto),
    }),
  /**
   * Prestataires desservant la ville du logement.
   *
   * Le creneau est facultatif : sans lui la liste montre tout le monde, avec
   * lui elle ecarte ceux qui ne travaillent pas a ces heures-la. Un ecran qui
   * n afficherait rien tant qu aucune date n est choisie donnerait l impression
   * qu il n existe aucun prestataire.
   */
  cleanersNear: (listingId: string, creneau?: { date: string; startTime: string; endTime: string }) =>
    request<any[]>(
      `/api/v1/services/menage/autour-de/${listingId}${creneau ? `?${new URLSearchParams(creneau)}` : ''}`,
      { auth: true },
    ),
  requestCleaning: (listingId: string, dto: any) =>
    request<any>(`/api/v1/services/menage/${listingId}`, {
      method: 'POST',
      auth: true,
      body: body(dto),
    }),
  myServiceOrders: () => request<any[]>('/api/v1/services/mes-commandes', { auth: true }),

  // --- negociation du tarif de menage ---
  /** Le sens se deduit de l appelant, cote serveur : chaque camp garde sa colonne. */
  counterServicePrice: (id: string, price: number, message?: string) =>
    request<any>(`/api/v1/services/mes-commandes/${id}/contre-proposer`, {
      method: 'POST',
      auth: true,
      body: body({ price, message }),
    }),
  acceptServicePrice: (id: string) =>
    request<any>(`/api/v1/services/mes-commandes/${id}/accepter`, { method: 'POST', auth: true }),

  // --- sinistres ---
  serviceIncidents: (id: string) =>
    request<any[]>(`/api/v1/services/mes-commandes/${id}/sinistres`, { auth: true }),
  contestIncident: (id: string, motif: string) =>
    request<any>(`/api/v1/services/sinistres/${id}/contester`, {
      method: 'POST',
      auth: true,
      body: body({ motif }),
    }),

  // --- mon profil ---
  /**
   * Mise a jour de son propre compte.
   *
   * La route porte l identifiant dans l URL et le serveur refuse toute autre
   * cible que soi-meme : on le passe donc explicitement plutot que d inventer
   * un `/me` qui n existe pas cote API.
   */
  updateMe: (id: string, dto: Record<string, unknown>) =>
    request<any>(`/api/v1/users/${id}`, { method: 'PATCH', auth: true, body: body(dto) }),

  // --- favoris ---
  /** Bascule : une seule route, l interface n a qu un bouton coeur. */
  toggleFavorite: (listingId: string) =>
    request<{ favori: boolean }>(`/api/v1/favoris/${listingId}`, { method: 'POST', auth: true }),
  favorites: () => request<any[]>('/api/v1/favoris', { auth: true }),
  /** Identifiants seuls : la liste a deja les logements, elle n a besoin que
   *  de savoir lesquels sont marques. */
  favoriteIds: () => request<string[]>('/api/v1/favoris/ids', { auth: true }),

  // --- referentiel des villes, cote administration ---
  adminCities: () =>
    request<{ source: 'statique' | 'base'; villes: any[] }>('/api/v1/admin/villes', { auth: true }),
  adminImportCities: () =>
    request<{ importees: number }>('/api/v1/admin/villes/importer', { method: 'POST', auth: true }),
  adminCreateCity: (dto: { name: string; region: string; latitude: number; longitude: number }) =>
    request<any>('/api/v1/admin/villes', { method: 'POST', auth: true, body: body(dto) }),
  adminUpdateCity: (id: string, dto: any) =>
    request<any>(`/api/v1/admin/villes/${id}`, { method: 'PATCH', auth: true, body: body(dto) }),
  adminDeleteCity: (id: string) =>
    request<any>(`/api/v1/admin/villes/${id}`, { method: 'DELETE', auth: true }),

  // --- zones et disponibilites du prestataire ---
  /** Villes desservies. Choisies dans le referentiel, jamais saisies librement. */
  providerZones: () => request<any[]>('/api/v1/prestataire/zones', { auth: true }),
  addProviderZone: (citySlug: string) =>
    request<any>('/api/v1/prestataire/zones', {
      method: 'POST',
      auth: true,
      body: body({ citySlug }),
    }),
  removeProviderZone: (id: string) =>
    request<any>(`/api/v1/prestataire/zones/${id}`, { method: 'DELETE', auth: true }),

  providerAvailability: () =>
    request<{ creneaux: any[]; absences: any[] }>('/api/v1/prestataire/disponibilites', {
      auth: true,
    }),
  addProviderSlot: (dto: { dayOfWeek: number; startTime: string; endTime: string }) =>
    request<any>('/api/v1/prestataire/disponibilites', {
      method: 'POST',
      auth: true,
      body: body(dto),
    }),
  removeProviderSlot: (id: string) =>
    request<any>(`/api/v1/prestataire/disponibilites/${id}`, { method: 'DELETE', auth: true }),
  addProviderTimeOff: (dto: { startDate: string; endDate: string; note?: string }) =>
    request<any>('/api/v1/prestataire/absences', { method: 'POST', auth: true, body: body(dto) }),
  removeProviderTimeOff: (id: string) =>
    request<any>(`/api/v1/prestataire/absences/${id}`, { method: 'DELETE', auth: true }),

  // --- catalogue vehicules ---
  /** Public : une liste deroulante ne doit pas attendre un jeton pour s afficher. */
  vehicleCatalog: () =>
    request<{ marque: string; modeles: string[] }[]>('/api/v1/catalogue/vehicules'),

  // --- dates de menage suggerees ---
  /** Les departs a venir : l hote n a pas a recopier son propre calendrier. */
  cleaningSuggestedDates: (listingId: string) =>
    request<{ ville: string; region: string; departs: { bookingId: string; date: string; voyageurs: number }[] }>(
      `/api/v1/services/menage/dates-suggerees/${listingId}`,
      { auth: true },
    ),

  // --- espace prestataire ---
  /** Ce que le prestataire sait du demandeur AVANT d accepter. Sans coordonnees. */
  providerClientProfile: (demandeId: string) =>
    request<any>(`/api/v1/prestataire/demandes/${demandeId}/client`, { auth: true }),
  providerCounterPrice: (demandeId: string, price: number, message?: string) =>
    request<any>(`/api/v1/prestataire/demandes/${demandeId}/contre-proposer`, {
      method: 'POST',
      auth: true,
      body: body({ price, message }),
    }),
  declareIncident: (demandeId: string, dto: any) =>
    request<any>(`/api/v1/prestataire/demandes/${demandeId}/sinistre`, {
      method: 'POST',
      auth: true,
      body: body(dto),
    }),
  withdrawIncident: (id: string) =>
    request<any>(`/api/v1/prestataire/sinistres/${id}`, { method: 'DELETE', auth: true }),
  addVehiclePhoto: (vehicleId: string, url: string, isPrimary?: boolean) =>
    request<any>(`/api/v1/prestataire/vehicules/${vehicleId}/photos`, {
      method: 'POST',
      auth: true,
      body: body({ url, isPrimary }),
    }),
  removeVehiclePhoto: (vehicleId: string, photoId: string) =>
    request<any>(`/api/v1/prestataire/vehicules/${vehicleId}/photos/${photoId}`, {
      method: 'DELETE',
      auth: true,
    }),

  // --- envoi de fichiers ---
  /**
   * Demande une URL d envoi signee, puis televerse DIRECTEMENT vers le
   * stockage : le fichier ne transite jamais par l API, qui tourne sur une
   * instance gratuite.
   */
  uploadFile: async (file: File, dossier: string) => {
    const { uploadUrl, publicUrl, simulated } = await request<any>('/api/v1/media/presign', {
      method: 'POST',
      auth: true,
      body: body({ fileName: file.name, contentType: file.type, dossier }),
    });
    // En mode simule il n y a rien a televerser : le serveur a deja rendu une
    // image de substitution, et appeler uploadUrl echouerait.
    if (simulated) return publicUrl as string;

    const envoi = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!envoi.ok) throw new Error("L envoi de l image a echoue");
    return publicUrl as string;
  },
  cancelServiceOrder: (id: string) =>
    request<any>(`/api/v1/services/mes-commandes/${id}/annuler`, { method: 'POST', auth: true }),
  /** Le sens de l avis se deduit de l appelant, il ne se choisit pas. */
  rateService: (id: string, rating: number, comment?: string) =>
    request<any>(`/api/v1/services/prestations/${id}/avis`, {
      method: 'POST',
      auth: true,
      body: body({ rating, comment }),
    }),
  providerReviews: (providerId: string) =>
    request<any[]>(`/api/v1/services/prestataires/${providerId}/avis`, { auth: true }),

  // ------------------------------------------------------- Administration
  adminProviders: (params: Record<string, any> = {}) =>
    request<any[]>(`/api/v1/admin/prestataires?${new URLSearchParams(clean(params))}`, {
      auth: true,
    }),
  /** Renvoie les identifiants une seule fois : ils ne sont plus recuperables ensuite. */
  adminCreateProvider: (dto: any) =>
    request<any>('/api/v1/admin/prestataires', { method: 'POST', auth: true, body: body(dto) }),
  adminVerifyProvider: (id: string) =>
    request<any>(`/api/v1/admin/prestataires/${id}/verifier`, { method: 'POST', auth: true }),
  adminSuspendProvider: (id: string, motif?: string) =>
    request<any>(`/api/v1/admin/prestataires/${id}/suspendre`, {
      method: 'POST',
      auth: true,
      body: body({ motif }),
    }),
  adminResetProviderPassword: (id: string) =>
    request<any>(`/api/v1/admin/prestataires/${id}/mot-de-passe`, { method: 'POST', auth: true }),
};

function clean(params: Record<string, any>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
}
