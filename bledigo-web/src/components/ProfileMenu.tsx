'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRound, Heart, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useT } from '@/store/preferences';

/**
 * Menu du compte, ouvert par un clic sur le nom.
 *
 * Le prenom etait un lien direct vers /profil : cliquer dessus emmenait
 * ailleurs sans prevenir, et les favoris comme la deconnexion vivaient a deux
 * endroits differents de la barre. Un menu regroupe ce qui concerne le compte
 * et rend le geste previsible.
 *
 * L initiale sert d avatar tant qu il n y a pas de photo : un rond colore se
 * repere du coin de l oeil, la ou une icone generique se confond avec les
 * autres boutons de la barre.
 */
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);

  // Fermeture au clic exterieur et a Echap : un menu qui ne se ferme que par
  // son propre bouton finit par rester ouvert sous les doigts.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false);
    };
    document.addEventListener('mousedown', dehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  if (!user) return null;

  const initiale = (user.firstName || user.email || '?').charAt(0).toUpperCase();

  const entrees = [
    { href: '/profil', label: 'Mon profil', icon: Settings },
    { href: '/favoris', label: 'Mes favoris', icon: Heart },
  ];

  return (
    <div className="relative" ref={boite}>
      <button
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        className="flex items-center gap-2 p-1 pe-2 rounded-full hover:bg-cloud transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-bledi-red text-white grid place-items-center font-medium text-sm shrink-0">
          {initiale}
        </span>
        <span className="hidden lg:block text-charcoal font-medium">{user.firstName}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate transition-transform ${ouvert ? 'rotate-180' : ''}`}
        />
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-56 bg-white rounded-bledi shadow-bledi-hover border border-cloud overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-cloud">
            <p className="font-medium text-charcoal truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate truncate">{user.email}</p>
          </div>

          {entrees.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              role="menuitem"
              onClick={() => setOuvert(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal hover:bg-cream transition-colors"
            >
              <e.icon className="w-4 h-4 text-slate" />
              {e.label}
            </Link>
          ))}

          <button
            role="menuitem"
            onClick={() => {
              setOuvert(false);
              logout();
              router.push('/');
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors border-t border-cloud"
          >
            <LogOut className="w-4 h-4" />
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
