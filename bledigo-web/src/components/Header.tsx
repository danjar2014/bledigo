'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { usePreferences } from '@/store/preferences';
import { useMode, modesOf } from '@/store/mode';
import PreferencesMenu from '@/components/PreferencesMenu';
import ModeSwitch from '@/components/ModeSwitch';
import {
  Shield,
  LogOut,
  LayoutDashboard,
  CalendarCheck,
  Home,
  CreditCard,
  Map,
  Search,
  MessageSquare,
} from 'lucide-react';

/** Liens propres a chaque mode d utilisation. */
const NAV_BY_MODE = {
  traveler: [
    { href: '/recherche', labelKey: 'nav.search', icon: Search },
    { href: '/besoins', labelKey: 'nav.needs', icon: MessageSquare },
    { href: '/reservations', labelKey: 'nav.bookings', icon: CalendarCheck },
  ],
  owner: [
    { href: '/proprietaire', labelKey: 'nav.owner', icon: Home },
    { href: '/besoins', labelKey: 'nav.requests', icon: MessageSquare },
    { href: '/proprietaire/credits', labelKey: 'nav.credits', icon: CreditCard },
  ],
} as const;

/** Liens reserves au back-office, independants du mode. */
const ADMIN_ROLES = ['admin', 'support', 'agent'];

export default function Header() {
  const { user, logout, loading } = useAuth();
  const t = usePreferences((s) => s.t);
  const mode = useMode((s) => s.mode);
  const router = useRouter();

  const available = modesOf(user);
  const effectiveMode = available.includes(mode) ? mode : available[0] ?? 'traveler';
  const links = user ? NAV_BY_MODE[effectiveMode] : [];
  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-cloud">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-bold text-xl text-bledi-blue shrink-0"
        >
          <Shield className="w-6 h-6 text-bledi-gold" />
          BlediGo
        </Link>

        <nav className="flex items-center gap-1 md:gap-2 text-sm">
          {!user && (
            <>
              <Link href="/recherche" className="text-slate hover:text-bledi-blue px-2 py-1">
                {t('nav.search')}
              </Link>
              <Link
                href="/carte"
                className="hidden sm:flex items-center gap-1 text-slate hover:text-bledi-blue px-2 py-1"
              >
                <Map className="w-4 h-4" />
                {t('nav.map')}
              </Link>
            </>
          )}

          {user &&
            links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hidden md:flex items-center gap-1.5 text-slate hover:text-bledi-blue px-2 py-1"
              >
                <l.icon className="w-4 h-4" />
                {t(l.labelKey)}
              </Link>
            ))}

          {isAdmin && (
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1.5 text-slate hover:text-bledi-blue px-2 py-1"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t('nav.admin')}
            </Link>
          )}

          {user && <ModeSwitch />}

          <PreferencesMenu />

          {loading ? (
            <div className="w-24 h-9 rounded-bledi-sm bg-cloud animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span className="hidden lg:block text-charcoal font-medium">{user.firstName}</span>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
                className="p-2 rounded-bledi-sm text-slate hover:bg-cloud"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/connexion" className="text-slate hover:text-bledi-blue px-2 py-1">
                {t('nav.login')}
              </Link>
              <Link
                href="/inscription"
                className="bg-bledi-blue text-white px-4 py-2 rounded-bledi-sm font-medium hover:opacity-90 whitespace-nowrap"
              >
                {t('nav.register')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
