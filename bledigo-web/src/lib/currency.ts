/**
 * Devises d affichage. Les montants sont stockes en TND cote API :
 * la conversion est purement visuelle, le paiement reste en devise d origine.
 */

export const CURRENCIES = ['TND', 'EUR', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'TND';

export const CURRENCY_META: Record<Currency, { label: string; symbol: string }> = {
  TND: { label: 'Dinar tunisien', symbol: 'DT' },
  EUR: { label: 'Euro', symbol: '€' },
  USD: { label: 'Dollar US', symbol: '$' },
};

/**
 * Taux de repli, utilises tant que l API de change n est pas branchee.
 * Exprimes en unites de devise pour 1 TND.
 */
export const FALLBACK_RATES: Record<Currency, number> = {
  TND: 1,
  EUR: 0.29,
  USD: 0.32,
};

export function convert(
  amountTnd: number,
  to: Currency,
  rates: Record<Currency, number> = FALLBACK_RATES,
): number {
  const rate = rates[to] ?? FALLBACK_RATES[to] ?? 1;
  return amountTnd * rate;
}

export function formatMoney(
  amountTnd: number,
  currency: Currency = DEFAULT_CURRENCY,
  locale = 'fr-FR',
  rates?: Record<Currency, number>,
): string {
  const value = convert(amountTnd, currency, rates);
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
  return `${formatted} ${CURRENCY_META[currency].symbol}`;
}
