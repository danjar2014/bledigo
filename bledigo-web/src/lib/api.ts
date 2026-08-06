/**
 * Client HTTP de l API BlediGo.
 * Le token d acces est injecte automatiquement et rafraichi via /auth/refresh.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Tokens = { accessToken: string; refreshToken: string };

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

  // --- annonces ---
  listings: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/listings?${new URLSearchParams(clean(params))}`),
  listing: (id: string) => request<any>(`/api/v1/listings/${id}`),
  availability: (id: string) => request<any>(`/api/v1/listings/${id}/availability`),
  createListing: (dto: any) =>
    request<any>('/api/v1/listings', { method: 'POST', auth: true, body: body(dto) }),
  publishListing: (id: string) =>
    request<any>(`/api/v1/listings/${id}/publish`, { method: 'POST', auth: true }),
  addPhoto: (id: string, dto: any) =>
    request<any>(`/api/v1/listings/${id}/photos`, { method: 'POST', auth: true, body: body(dto) }),

  // --- recherche ---
  search: (params: Record<string, any>) =>
    request<any>(`/api/v1/search?${new URLSearchParams(clean(params))}`),
  suggestions: (q: string) => request<any>(`/api/v1/search/suggestions?q=${encodeURIComponent(q)}`),

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
  createReview: (dto: any) =>
    request<any>('/api/v1/reviews', { method: 'POST', auth: true, body: body(dto) }),

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
  reverseSearches: (params: Record<string, any> = {}) =>
    request<any>(`/api/v1/reverse-searches?${new URLSearchParams(clean(params))}`),
  createReverseSearch: (dto: any) =>
    request<any>('/api/v1/reverse-searches', { method: 'POST', auth: true, body: body(dto) }),
  makeOffer: (id: string, dto: any) =>
    request<any>(`/api/v1/reverse-searches/${id}/offers`, { method: 'POST', auth: true, body: body(dto) }),

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
