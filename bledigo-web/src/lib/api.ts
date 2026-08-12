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
  localities: () => request<any[]>('/api/v1/localities'),

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
  users: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/users?${new URLSearchParams(clean(params))}`),
};

function clean(params: Record<string, any>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
}
