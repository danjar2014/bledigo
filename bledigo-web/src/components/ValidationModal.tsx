'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

const CRITERIA: { key: string; label: string }[] = [
  { key: 'conform', label: 'Le logement correspond a l annonce' },
  { key: 'photosConform', label: 'Les photos sont conformes a la realite' },
  { key: 'locationConform', label: 'L emplacement est celui annonce' },
  { key: 'amenitiesPresent', label: 'Les equipements annonces sont presents' },
  { key: 'clean', label: 'Le logement est propre' },
];

export default function ValidationModal({
  booking,
  onClose,
}: {
  booking: any;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [checks, setChecks] = useState<Record<string, boolean>>({
    conform: true,
    photosConform: true,
    locationConform: true,
    amenitiesPresent: true,
    clean: true,
  });
  const [comment, setComment] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!booking.validationDeadline) return;
    const tick = () => {
      const ms = new Date(booking.validationDeadline).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [booking.validationDeadline]);

  const validate = useMutation({
    mutationFn: () => api.validateStay(booking.id, { ...checks, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
  });

  const allOk = CRITERIA.every((c) => checks[c.key]);
  const mm = remaining != null ? String(Math.floor(remaining / 60)).padStart(2, '0') : '--';
  const ss = remaining != null ? String(remaining % 60).padStart(2, '0') : '--';

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-bledi w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-charcoal">Validation du sejour</h2>
            <p className="text-sm text-slate">{booking.listing?.title}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate hover:text-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`rounded-bledi-sm p-3 mb-4 text-sm ${
            remaining === 0 ? 'bg-amber-50 text-amber-800' : 'bg-cloud text-charcoal'
          }`}
        >
          {remaining === 0 ? (
            <>Delai depasse : le sejour sera auto-valide et le paiement libere.</>
          ) : (
            <>
              Temps restant pour verifier : <span className="font-accent font-bold">{mm}:{ss}</span>
            </>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {CRITERIA.map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-3 p-3 rounded-bledi-sm border border-cloud cursor-pointer hover:bg-cream"
            >
              <input
                type="checkbox"
                checked={checks[c.key]}
                onChange={(e) => setChecks({ ...checks, [c.key]: e.target.checked })}
                className="w-4 h-4 accent-bledi-blue"
              />
              <span className="text-charcoal text-sm">{c.label}</span>
            </label>
          ))}
        </div>

        {!allOk && (
          <div className="flex items-start gap-2 bg-red-50 text-red-800 rounded-bledi-sm p-3 mb-4 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Un litige sera ouvert automatiquement et le paiement restera bloque le temps de
            l instruction.
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Commentaire (optionnel)</label>
        <textarea
          className="input-bledi mb-4 h-24"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Precisez ce qui ne va pas..."
        />

        {validate.error && (
          <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-3">
            {(validate.error as Error).message}
          </div>
        )}

        <button
          onClick={() => validate.mutate()}
          disabled={validate.isPending}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-bledi-sm font-medium text-white disabled:opacity-50 ${
            allOk ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          {validate.isPending
            ? 'Envoi...'
            : allOk
              ? 'Tout est conforme, liberer le paiement'
              : 'Signaler et ouvrir un litige'}
        </button>
      </div>
    </div>
  );
}
