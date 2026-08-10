'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe, Coins, Moon, Sun, Check } from 'lucide-react';
import { usePreferences } from '@/store/preferences';
import { LOCALES, LOCALE_META, type Locale } from '@/lib/i18n';
import { CURRENCIES, CURRENCY_META, type Currency } from '@/lib/currency';

type Panel = 'locale' | 'currency' | null;

export default function PreferencesMenu() {
  const { locale, currency, theme, setLocale, setCurrency, toggleTheme, t } = usePreferences();
  const [open, setOpen] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="flex items-center gap-1">
      {/* Langue */}
      <div className="relative">
        <button
          onClick={() => setOpen(open === 'locale' ? null : 'locale')}
          aria-label={t('nav.language')}
          aria-expanded={open === 'locale'}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate hover:bg-cloud transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm uppercase">{locale}</span>
        </button>
        {open === 'locale' && (
          <ul className="absolute end-0 mt-1 w-44 bg-white rounded-bledi-sm shadow-bledi-hover border border-cloud py-1 z-50">
            {LOCALES.map((l: Locale) => (
              <li key={l}>
                <button
                  onClick={() => {
                    setLocale(l);
                    setOpen(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-cloud text-charcoal"
                >
                  <span aria-hidden>{LOCALE_META[l].flag}</span>
                  <span className="flex-1 text-start">{LOCALE_META[l].label}</span>
                  {locale === l && <Check className="w-4 h-4 text-bledi-blue" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Devise */}
      <div className="relative">
        <button
          onClick={() => setOpen(open === 'currency' ? null : 'currency')}
          aria-label={t('nav.currency')}
          aria-expanded={open === 'currency'}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate hover:bg-cloud transition-colors"
        >
          <Coins className="w-4 h-4" />
          <span className="text-sm">{currency}</span>
        </button>
        {open === 'currency' && (
          <ul className="absolute end-0 mt-1 w-48 bg-white rounded-bledi-sm shadow-bledi-hover border border-cloud py-1 z-50">
            {CURRENCIES.map((c: Currency) => (
              <li key={c}>
                <button
                  onClick={() => {
                    setCurrency(c);
                    setOpen(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-cloud text-charcoal"
                >
                  <span className="w-8 font-medium">{CURRENCY_META[c].symbol}</span>
                  <span className="flex-1 text-start">{CURRENCY_META[c].label}</span>
                  {currency === c && <Check className="w-4 h-4 text-bledi-blue" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Theme */}
      <button
        onClick={toggleTheme}
        aria-label={t('nav.theme')}
        className="p-2 rounded-lg text-slate hover:bg-cloud transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  );
}
