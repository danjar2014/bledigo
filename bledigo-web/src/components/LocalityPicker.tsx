'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronDown, Search, Check } from 'lucide-react';
import { api } from '@/lib/api';

export interface Locality {
  slug: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

/**
 * Choix d une localite dans le referentiel partage.
 *
 * La saisie libre est volontairement impossible : ville et gouvernorat servent
 * a rapprocher les demandes des voyageurs et les zones des proprietaires. Une
 * orthographe approximative casserait ce rapprochement.
 */
export default function LocalityPicker({
  value,
  onChange,
  label = 'Destination',
  placeholder = 'Choisir une ville',
  required,
  id = 'locality',
}: {
  /** Slug de la localite selectionnee. */
  value: string;
  onChange: (locality: Locality | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['localities'],
    queryFn: () => api.localities(),
    staleTime: Infinity, // referentiel statique
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const all: Locality[] = useMemo(
    () => (groups ?? []).flatMap((g: any) => g.items as Locality[]),
    [groups],
  );

  const selected = all.find((l) => l.slug === value) ?? null;

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const filtered = useMemo(() => {
    if (!term.trim()) return groups ?? [];
    const q = normalize(term);
    return (groups ?? [])
      .map((g: any) => ({
        region: g.region,
        items: (g.items as Locality[]).filter(
          (l) => normalize(l.name).includes(q) || normalize(l.region).includes(q),
        ),
      }))
      .filter((g: any) => g.items.length > 0);
  }, [groups, term]);

  return (
    <div ref={ref} className="relative">
      <label htmlFor={id} className="block text-sm font-medium mb-1 text-charcoal">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input-bledi flex items-center justify-between text-start"
      >
        <span className={selected ? 'text-charcoal' : 'text-slate'}>
          {selected ? (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-bledi-blue" />
              {selected.name}
              <span className="text-slate text-sm">· {selected.region}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-slate shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-bledi-sm shadow-bledi-hover border border-cloud">
          <div className="p-2 border-b border-cloud">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-slate" />
              <input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Rechercher une ville ou un gouvernorat"
                className="w-full py-1.5 text-sm outline-none bg-transparent"
              />
            </div>
          </div>

          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {isLoading && <li className="px-4 py-2 text-sm text-slate">Chargement...</li>}

            {!isLoading && filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate">
                Aucune localite ne correspond. BlediGo couvre {all.length} villes en Tunisie.
              </li>
            )}

            {filtered.map((group: any) => (
              <li key={group.region}>
                <div className="px-4 py-1.5 text-xs font-semibold text-slate bg-cream sticky top-0">
                  {group.region}
                </div>
                <ul>
                  {group.items.map((loc: Locality) => (
                    <li key={loc.slug}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={loc.slug === value}
                        onClick={() => {
                          onChange(loc);
                          setOpen(false);
                          setTerm('');
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-cloud text-charcoal text-start"
                      >
                        <span className="flex-1">{loc.name}</span>
                        {loc.slug === value && <Check className="w-4 h-4 text-bledi-blue" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
