'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ShieldCheck, AlertTriangle, Scale, DoorOpen } from 'lucide-react';
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
  /** Le refus annule le sejour et rembourse : il demande une confirmation. */
  const [confirmeRefus, setConfirmeRefus] = useState(false);

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

  const refuse = useMutation({
    mutationFn: () => api.refuseStay(booking.id, { ...checks, reason: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-feed'] });
      onClose();
    },
  });

  const allOk = CRITERIA.every((c) => checks[c.key]);
  const delaiDepasse = remaining === 0;
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
          <div className="bg-amber-50 text-amber-900 rounded-bledi-sm p-3 mb-4 text-sm">
            <p className="flex items-start gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Deux issues possibles
            </p>
            <p className="mt-2 ms-6">
              <strong>Ouvrir un litige</strong> si vous restez sur place : le paiement est bloque le
              temps de l instruction.
            </p>
            <p className="mt-1 ms-6">
              <strong>Refuser le logement</strong> si vous repartez : la reservation est annulee et
              vous n etes pas debite.
            </p>
          </div>
        )}

        <label className="block text-sm font-medium mb-1">
          {allOk ? 'Commentaire (optionnel)' : 'Ce qui ne va pas'}
          {!allOk && <span className="text-slate font-normal"> — requis pour refuser</span>}
        </label>
        <textarea
          className="input-bledi mb-1 h-24"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Decrivez precisement l ecart constate..."
        />
        {!allOk && (
          <p className="text-xs text-slate mb-4">
            {comment.trim().length < 15
              ? `Encore ${15 - comment.trim().length} caractere(s) pour pouvoir refuser.`
              : 'Ce texte sera transmis a l hote et servira de piece en cas de contestation.'}
          </p>
        )}
        {allOk && <div className="mb-4" />}

        {(validate.error || refuse.error) && (
          <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-3">
            {((validate.error || refuse.error) as Error).message}
          </div>
        )}

        <button
          onClick={() => validate.mutate()}
          disabled={validate.isPending || refuse.isPending}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-bledi-sm font-medium text-white disabled:opacity-50 ${
            allOk ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
          }`}
        >
          {allOk ? <ShieldCheck className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
          {validate.isPending
            ? 'Envoi...'
            : allOk
              ? 'Tout est conforme, liberer le paiement'
              : 'Rester sur place et ouvrir un litige'}
        </button>

        {/* Le refus n a de sens que si un critere cloche, et seulement tant que
            la fenetre de verification est ouverte : au-dela le sejour
            s auto-valide, il n est plus possible de refuser apres avoir occupe
            les lieux. */}
        {!allOk && !delaiDepasse && (
          <div className="mt-3 pt-3 border-t border-cloud">
            {!confirmeRefus ? (
              <button
                onClick={() => setConfirmeRefus(true)}
                disabled={validate.isPending || refuse.isPending || comment.trim().length < 15}
                title={
                  comment.trim().length < 15
                    ? 'Decrivez d abord ce qui ne va pas'
                    : undefined
                }
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-bledi-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <DoorOpen className="w-5 h-5" />
                Je refuse le logement et j annule
              </button>
            ) : (
              <div className="bg-red-50 rounded-bledi-sm p-3">
                <p className="text-sm text-red-900 mb-3">
                  La reservation sera <strong>annulee</strong> et vous ne serez{' '}
                  <strong>pas debite</strong>. Cette action est definitive : vous ne pourrez plus
                  valider ce sejour ni ouvrir de litige.
                </p>
                <p className="text-sm text-red-900 mb-3 border-t border-red-200 pt-3">
                  Chaque refus est <strong>enregistre et controle</strong>, des deux cotes. Au
                  deuxieme refus, le compte concerne est <strong>suspendu</strong> le temps d une
                  verification — voyageur comme hote.
                </p>
                <p className="text-xs text-red-800/90 mb-3">
                  S entendre avec l hote pour annuler ici puis regler en direct revient a un
                  contournement : la protection du paiement disparait, et les deux comptes tombent.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => refuse.mutate()}
                    disabled={refuse.isPending}
                    className="flex-1 px-4 py-2 rounded-bledi-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {refuse.isPending ? 'Annulation...' : 'Confirmer le refus'}
                  </button>
                  <button
                    onClick={() => setConfirmeRefus(false)}
                    disabled={refuse.isPending}
                    className="px-4 py-2 rounded-bledi-sm font-medium border border-cloud text-slate hover:bg-white"
                  >
                    Revenir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
