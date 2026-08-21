'use client';

import { create } from 'zustand';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, translate, type Locale } from '@/lib/i18n';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
  formatMoney,
  type Currency,
} from '@/lib/currency';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'bledigo.preferences';

interface Stored {
  locale: Locale;
  currency: Currency;
  theme: Theme;
}

function read(): Stored {
  const fallback: Stored = { locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY, theme: 'light' };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      locale: LOCALES.includes(parsed.locale as Locale) ? (parsed.locale as Locale) : fallback.locale,
      currency: CURRENCIES.includes(parsed.currency as Currency)
        ? (parsed.currency as Currency)
        : fallback.currency,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return fallback;
  }
}

function persist(state: Stored) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Applique langue, direction et theme au document. */
function applyToDocument({ locale, theme }: Pick<Stored, 'locale' | 'theme'>) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = LOCALE_META[locale].dir;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface PreferencesState extends Stored {
  hydrated: boolean;
  rates: Record<Currency, number>;
  hydrate: () => void;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  toggleTheme: () => void;
  /** Traduit une cle dans la langue courante. */
  t: (key: string) => string;
  /** Formate un montant stocke en TND dans la devise courante. */
  money: (amountTnd: number) => string;
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
  theme: 'light',
  hydrated: false,
  rates: FALLBACK_RATES,

  hydrate: () => {
    const stored = read();
    applyToDocument(stored);
    set({ ...stored, hydrated: true });
  },

  setLocale: (locale) => {
    const next = { ...pick(get()), locale };
    persist(next);
    applyToDocument(next);
    set({ locale });
  },

  setCurrency: (currency) => {
    const next = { ...pick(get()), currency };
    persist(next);
    set({ currency });
  },

  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    const next = { ...pick(get()), theme };
    persist(next);
    applyToDocument(next);
    set({ theme });
  },

  t: (key) => translate(get().locale, key),

  money: (amountTnd) => {
    const { currency, locale, rates } = get();
    return formatMoney(amountTnd, currency, localeTag(locale), rates);
  },
}));

function pick(state: PreferencesState): Stored {
  return { locale: state.locale, currency: state.currency, theme: state.theme };
}

/**
 * Formateur de montant abonne a la devise choisie.
 *
 * A utiliser dans les composants a la place de `money` de lib/format, qui est
 * fige en TND et ne declenche pas de rendu au changement de devise.
 *
 * INVARIANT — L ARGUMENT EST TOUJOURS EN TND, jamais dans une autre devise.
 *
 * Le dinar est la monnaie de REGLEMENT du projet : tout se calcule en TND, tout
 * se paie en TND, et l euro comme le dollar ne servent qu a montrer
 * l equivalent au voyageur etranger. Rien de ce que cette fonction rend ne doit
 * repartir vers l API ni etre saisi dans un champ : c est de l affichage.
 *
 * Passer un montant deja libelle en EUR le fait traiter comme des dinars, puis
 * reconvertir. Le bogue est SILENCIEUX — il rend un nombre plausible — et il
 * s est produit : les plans d abonnement, libelles en EUR, s affichaient a 29 %
 * de leur valeur pour un visiteur en euros — 29 EUR rendus « 8,41 EUR ». Si un montant n est pas
 * en TND, affichez-le avec sa propre devise sans passer par ici.
 */
export function useMoney() {
  const currency = usePreferences((s) => s.currency);
  const locale = usePreferences((s) => s.locale);
  const rates = usePreferences((s) => s.rates);
  return (amountTnd: number | string) =>
    formatMoney(Number(amountTnd) || 0, currency, localeTag(locale), rates);
}

/** Traduction abonnee a la langue choisie. */
export function useT() {
  const locale = usePreferences((s) => s.locale);
  return (key: string) => translate(locale, key);
}

function localeTag(locale: Locale) {
  return locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR';
}
