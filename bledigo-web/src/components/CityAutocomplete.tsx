'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, X } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * Champ de destination a completion.
 *
 * Remplace le <datalist> precedent, qui ne convenait pas : selon les
 * navigateurs il ne rapproche que le DEBUT du nom, ignore les accents et
 * n affiche rien tant que la saisie ne correspond pas exactement. Taper
 * « bou » ne proposait donc pas « Sidi Bou Said », et « hamamet » ne trouvait
 * pas « Hammamet ».
 *
 * Ici la recherche porte sur tout le libelle, region comprise, en comparant des
 * chaines normalisees — sans accents ni casse.
 */

function normaliser(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Toutes les villes',
}: {
  value: string;
  onChange: (ville: string) => void;
  placeholder?: string;
}) {
  const [saisie, setSaisie] = useState(value);
  const [ouvert, setOuvert] = useState(false);
  const [surligne, setSurligne] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);

  // La valeur peut changer de l exterieur : un clic sur une destination
  // suggeree, ou un retour arriere du navigateur.
  useEffect(() => setSaisie(value), [value]);

  const { data: brut } = useQuery({
    queryKey: ['localities', 'flat'],
    queryFn: () => api.localities(true),
    staleTime: Infinity,
  });

  /**
   * Tolerant aux deux formes du referentiel : liste plate, ou groupes par
   * region. L API peut renvoyer l une ou l autre selon le parametre, et une
   * ville sans `name` fait echouer la comparaison plus bas.
   */
  const localites: any[] = Array.isArray(brut)
    ? brut.flatMap((x: any) => (Array.isArray(x?.items) ? x.items : [x]))
    : [];

  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener('mousedown', auClic);
    return () => document.removeEventListener('mousedown', auClic);
  }, [ouvert]);

  const recherche = normaliser(saisie);
  const propositions = localites
    .filter((l: any) => l?.name)
    .filter((l: any) => {
      if (!recherche) return true;
      return (
        normaliser(l.name).includes(recherche) ||
        normaliser(l.region ?? '').includes(recherche)
      );
    })
    // Les correspondances en debut de nom passent devant : taper « sou » doit
    // proposer Sousse avant Bir El Bey (region Sousse).
    .sort((a: any, b: any) => {
      const da = normaliser(a.name).startsWith(recherche) ? 0 : 1;
      const db = normaliser(b.name).startsWith(recherche) ? 0 : 1;
      return da - db || a.name.localeCompare(b.name);
    })
    .slice(0, 8);

  const choisir = (ville: string) => {
    setSaisie(ville);
    onChange(ville);
    setOuvert(false);
  };

  const auClavier = (e: React.KeyboardEvent) => {
    if (!ouvert || propositions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSurligne((i) => (i + 1) % propositions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSurligne((i) => (i - 1 + propositions.length) % propositions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choisir(propositions[surligne].name);
    } else if (e.key === 'Escape') {
      setOuvert(false);
    }
  };

  return (
    <div className="relative" ref={conteneur}>
      <input
        className="input-bledi pe-8"
        value={saisie}
        placeholder={placeholder}
        onChange={(e) => {
          setSaisie(e.target.value);
          setSurligne(0);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onKeyDown={auClavier}
        role="combobox"
        aria-expanded={ouvert}
        aria-autocomplete="list"
      />

      {saisie && (
        <button
          onClick={() => choisir('')}
          aria-label="Effacer la destination"
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate hover:text-charcoal"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {ouvert && propositions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white rounded-bledi-sm shadow-bledi border border-cloud max-h-64 overflow-y-auto">
          {propositions.map((l: any, i: number) => (
            <li key={l.slug}>
              <button
                onMouseEnter={() => setSurligne(i)}
                onClick={() => choisir(l.name)}
                className={`w-full text-start px-3 py-2 text-sm flex items-center gap-2 ${
                  i === surligne ? 'bg-cream text-bledi-blue' : 'text-charcoal hover:bg-cream'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate" />
                <span className="truncate">
                  {l.name}
                  {l.region && l.region !== l.name && (
                    <span className="text-slate"> · {l.region}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {ouvert && recherche !== '' && propositions.length === 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-bledi-sm shadow-bledi border border-cloud px-3 py-3 text-sm text-slate">
          Aucune ville ne correspond a « {saisie} ».
        </div>
      )}
    </div>
  );
}
