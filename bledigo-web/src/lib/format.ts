export function money(amount: number, currency = 'TND') {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}

export function date(value: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
}

/**
 * Heure seule, pour les creneaux d intervention.
 *
 * Un menage se convient sur une plage horaire, pas sur une journee : afficher
 * la seule date obligerait le prestataire a rappeler pour savoir quand venir.
 */
export function heure(value: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}

export function nights(checkIn: string | Date, checkOut: string | Date) {
  return Math.max(
    1,
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );
}

/** Photo de repli quand une annonce n a pas encore d image */
export function photoOf(listing: any, index = 0) {
  const photo = listing?.photos?.[index]?.url;
  if (photo) return photo;
  const seed = encodeURIComponent(listing?.slug || listing?.id || 'bledigo');
  return `https://picsum.photos/seed/${seed}${index}/1200/800`;
}

export const CERTIFICATIONS: Record<string, { label: string; className: string }> = {
  none: { label: 'Non certifie', className: 'bg-cloud text-slate' },
  bronze: { label: 'Bronze', className: 'badge-bronze' },
  silver: { label: 'Silver', className: 'badge-silver' },
  gold: { label: 'Gold', className: 'badge-gold' },
  diamond: { label: 'Diamond', className: 'badge-diamond' },
};

export const BOOKING_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmee', className: 'bg-sky-100 text-sky-800' },
  checked_in: { label: 'Check-in effectue', className: 'bg-indigo-100 text-indigo-800' },
  validated: { label: 'Validee', className: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'Terminee', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Annulee', className: 'bg-slate-200 text-slate-700' },
  disputed: { label: 'Litige', className: 'bg-red-100 text-red-800' },
};
