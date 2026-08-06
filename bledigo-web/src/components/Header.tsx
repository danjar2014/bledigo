'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Shield, LogOut, LayoutDashboard, CalendarCheck, Home } from 'lucide-react';

const NAV_BY_ROLE: Record<string, { href: string; label: string; icon: any }[]> = {
  traveler: [{ href: '/reservations', label: 'Mes reservations', icon: CalendarCheck }],
  owner: [{ href: '/proprietaire', label: 'Espace proprietaire', icon: Home }],
  agency: [{ href: '/proprietaire', label: 'Espace agence', icon: Home }],
  admin: [{ href: '/admin', label: 'Back-office', icon: LayoutDashboard }],
  support: [{ href: '/admin', label: 'Back-office', icon: LayoutDashboard }],
  agent: [{ href: '/admin', label: 'Back-office', icon: LayoutDashboard }],
};

export default function Header() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const links = user ? NAV_BY_ROLE[user.role] || [] : [];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-cloud">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-bledi-blue">
          <Shield className="w-6 h-6 text-bledi-gold" />
          BlediGo
        </Link>

        <nav className="flex items-center gap-2 md:gap-4 text-sm">
          <Link href="/recherche" className="text-slate hover:text-bledi-blue px-2 py-1">
            Rechercher
          </Link>
          <Link href="/besoins" className="hidden sm:block text-slate hover:text-bledi-blue px-2 py-1">
            Recherche inversee
          </Link>

          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden md:flex items-center gap-1.5 text-slate hover:text-bledi-blue px-2 py-1"
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </Link>
          ))}

          {loading ? (
            <div className="w-24 h-9 rounded-bledi-sm bg-cloud animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-charcoal font-medium">{user.firstName}</span>
              <span className="hidden sm:block text-xs px-2 py-0.5 rounded-full bg-cloud text-slate">
                {user.role}
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                title="Se deconnecter"
                className="p-2 rounded-bledi-sm text-slate hover:bg-cloud"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/connexion" className="text-slate hover:text-bledi-blue px-2 py-1">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="bg-bledi-blue text-white px-4 py-2 rounded-bledi-sm font-medium hover:opacity-90"
              >
                Inscription
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
