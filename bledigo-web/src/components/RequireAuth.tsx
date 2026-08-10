'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useMode } from '@/store/mode';
import { Spinner } from './ui';

/** Roles effectifs : role principal + roles supplementaires actives. */
function effectiveRoles(user: { role?: string; roles?: string[] } | null): string[] {
  if (!user) return [];
  if (user.roles?.length) return user.roles;
  return user.role ? [user.role] : [];
}

/** Roles qu un utilisateur peut activer lui-meme depuis l interface. */
const SELF_ASSIGNABLE: Record<string, 'owner' | 'traveler'> = {
  owner: 'owner',
  agency: 'owner',
  traveler: 'traveler',
};

export default function RequireAuth({
  roles,
  children,
}: {
  roles?: string[];
  children: React.ReactNode;
}) {
  const { user, loading, enableRole } = useAuth();
  const setMode = useMode((s) => s.setMode);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/connexion');
  }, [loading, user, router]);

  if (loading) return <Spinner />;
  if (!user) return <Spinner label="Redirection..." />;

  const owned = effectiveRoles(user);
  const allowed = !roles || roles.some((r) => owned.includes(r));

  if (allowed) return <>{children}</>;

  // Le role manquant est-il activable par l utilisateur lui-meme ?
  const activatable = roles?.map((r) => SELF_ASSIGNABLE[r]).find(Boolean);

  async function activate() {
    if (!activatable || pending) return;
    setPending(true);
    setError(null);
    try {
      await enableRole(activatable);
      setMode(activatable === 'owner' ? 'owner' : 'traveler');
    } catch (e: any) {
      setError(e?.message || 'Activation impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="bg-white rounded-bledi p-8 text-center shadow-bledi max-w-lg mx-auto">
        {activatable === 'owner' ? (
          <>
            <Home className="w-10 h-10 text-bledi-blue mx-auto mb-3" />
            <h1 className="font-display font-semibold text-xl mb-2">Devenir hote</h1>
            <p className="text-slate mb-5">
              Votre compte est actuellement en mode voyageur. Activez le mode hote pour publier vos
              logements et recevoir des demandes. C est gratuit et vous gardez le meme compte.
            </p>
            <button onClick={activate} disabled={pending} className="btn-primary disabled:opacity-60">
              {pending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activation...
                </span>
              ) : (
                'Activer le mode hote'
              )}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display font-semibold text-xl mb-2">Acces reserve</h1>
            <p className="text-slate">
              Cette section est reservee aux roles : {roles?.join(', ')}. Votre compte dispose de :{' '}
              <strong>{owned.join(', ') || '—'}</strong>.
            </p>
          </>
        )}
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>
    </main>
  );
}
