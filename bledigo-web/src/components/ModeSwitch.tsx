'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Plane, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useMode, modesOf, type Mode } from '@/store/mode';

/** Ecran d atterrissage par defaut de chaque mode. */
const HOME_OF: Record<Mode, string> = {
  traveler: '/recherche',
  owner: '/proprietaire',
};

const LABEL_OF: Record<Mode, { label: string; icon: any }> = {
  traveler: { label: 'Voyageur', icon: Plane },
  owner: { label: 'Hote', icon: Home },
};

export default function ModeSwitch() {
  const { user, enableRole } = useAuth();
  const { mode, hydrated, hydrate, setMode } = useMode();
  const router = useRouter();
  const [pending, setPending] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = modesOf(user);

  useEffect(() => {
    if (!user || hydrated) return;
    hydrate(available.includes('owner') && !available.includes('traveler') ? 'owner' : 'traveler');
  }, [user, hydrated, hydrate, available]);

  // Un compte purement administratif n a pas de bascule a proposer
  if (!user || available.length === 0) return null;

  async function switchTo(target: Mode) {
    setError(null);

    // Le role n est pas encore actif : on l ajoute au compte a la volee
    if (!available.includes(target)) {
      setPending(target);
      try {
        await enableRole(target === 'owner' ? 'owner' : 'traveler');
      } catch (e: any) {
        setError(e?.message || 'Activation impossible.');
        setPending(null);
        return;
      }
      setPending(null);
    }

    setMode(target);
    router.push(HOME_OF[target]);
  }

  const modes: Mode[] = ['traveler', 'owner'];

  return (
    <div className="flex flex-col items-end">
      <div
        role="tablist"
        aria-label="Mode d utilisation"
        className="flex items-center gap-0.5 p-0.5 rounded-full bg-cloud"
      >
        {modes.map((m) => {
          const { label, icon: Icon } = LABEL_OF[m];
          const active = mode === m;
          const owned = available.includes(m);
          return (
            <button
              key={m}
              role="tab"
              aria-selected={active}
              onClick={() => switchTo(m)}
              disabled={pending !== null}
              title={owned ? `Passer en mode ${label}` : `Activer le mode ${label}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all disabled:opacity-60 ${
                active
                  ? 'bg-white text-bledi-blue shadow-sm font-medium'
                  : 'text-slate hover:text-bledi-blue'
              }`}
            >
              {pending === m ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{label}</span>
              {!owned && <span className="text-xs text-slate/70">+</span>}
            </button>
          );
        })}
      </div>
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
}
