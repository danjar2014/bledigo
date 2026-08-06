'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Users, Search } from 'lucide-react';

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState(2);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set('q', destination);
    if (dates.checkIn) params.set('checkIn', dates.checkIn);
    if (dates.checkOut) params.set('checkOut', dates.checkOut);
    params.set('guests', String(guests));
    router.push(`/recherche?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className={`bg-white rounded-bledi shadow-bledi-hover p-4 ${compact ? '' : 'md:p-6'}`}
    >
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-charcoal mb-2">Destination</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate w-5 h-5" />
            <input
              type="text"
              placeholder="Djerba, Sidi Bou Said, Hammamet..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="input-bledi pl-10"
            />
          </div>
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
