'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Search } from 'lucide-react';
import LocalityPicker, { type Locality } from './LocalityPicker';

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  /**
   * Destination choisie dans le REFERENTIEL, plus tapee librement.
   *
   * La saisie libre partait en `?q=` : « djerba », « Djerba » et « djerba  »
   * donnaient trois recherches differentes, et une faute de frappe rendait zero
   * resultat sans expliquer pourquoi. Le selecteur envoie un slug, que la
   * recherche sait resoudre.
   */
  const [ville, setVille] = useState<Locality | null>(null);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState(2);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    // On garde `q`, que la page de recherche lit deja : basculer sur `city`
    // aurait fait ignorer la destination en silence, la recherche ne
    // connaissant pas ce parametre. Ce qui change, c est que la valeur vient
    // du referentiel et porte donc toujours l orthographe canonique.
    if (ville) params.set('q', ville.name);
    if (dates.checkIn) params.set('checkIn', dates.checkIn);
    if (dates.checkOut) params.set('checkOut', dates.checkOut);
    params.set('guests', String(guests));
    router.push(`/recherche?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      /* Lisere rouge en haut de carte : le drapeau, pose sur l element le plus
         regarde de la page d accueil, sans transformer la carte en bandeau. Un
         border-t-[3px] plutot qu une ombre interne, pour qu il suive le rayon
         de l angle. */
      className={`bg-white rounded-bledi shadow-bledi-hover border-t-[3px] border-bledi-red p-4 ${compact ? '' : 'md:p-6'}`}
    >
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <LocalityPicker
            value={ville?.slug ?? ''}
            onChange={setVille}
            label="Destination"
            placeholder="Djerba, Sidi Bou Said, Hammamet..."
            id="destination-recherche"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-charcoal mb-2">Dates</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate w-5 h-5 pointer-events-none" />
              <input
                type="date"
                value={dates.checkIn}
                onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                className="input-bledi pl-10"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate w-5 h-5 pointer-events-none" />
              <input
                type="date"
                value={dates.checkOut}
                onChange={(e) => setDates({ ...dates, checkOut: e.target.value })}
                className="input-bledi pl-10"
              />
            </div>
          </div>
        </div>

        <div className="w-full md:w-40">
          <label className="block text-sm font-medium text-charcoal mb-2">Voyageurs</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate w-5 h-5 pointer-events-none" />
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="input-bledi pl-10"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} voyageur{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full md:w-auto flex items-center justify-center gap-2">
          <Search className="w-5 h-5" />
          Rechercher
        </button>
      </div>
    </form>
  );
}
