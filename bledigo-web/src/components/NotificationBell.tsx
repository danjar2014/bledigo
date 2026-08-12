'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, Handshake, CalendarCheck, CalendarX, Inbox, ArrowRight } from 'lucide-react';
import { api, type NotificationItem } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useMode, modesOf } from '@/store/mode';

/**
 * Date de derniere consultation, memorisee dans le navigateur.
 *
 * Ce choix evite d ajouter une colonne au modele, donc une migration sur une
 * base de production deja en service. Contrepartie assumee : la pastille se
 * reinitialise en changeant d appareil ou de navigateur.
 */
const CLE_VU = 'bledigo.notifications.vuLe';

function lireDerniereVue(): number {
  if (typeof window === 'undefined') return 0;
  const brut = window.localStorage.getItem(CLE_VU);
  const n = brut ? Number(brut) : 0;
  return Number.isFinite(n) ? n : 0;
}

const ICONES = {
  offer_received: Inbox,
  counter_answered: Handshake,
  counter_to_answer: Handshake,
  booking_to_confirm: CalendarCheck,
  booking_confirmed: CalendarCheck,
  booking_cancelled: CalendarX,
} as const;

/** Teintes : l action a mener ressort, l information reste discrete. */
const TEINTES: Record<string, string> = {
  offer_received: 'bg-bledi-gold/15 text-bledi-gold',
  counter_answered: 'bg-bledi-gold/15 text-bledi-gold',
  counter_to_answer: 'bg-bledi-gold/15 text-bledi-gold',
  booking_to_confirm: 'bg-emerald-100 text-emerald-700',
  booking_confirmed: 'bg-emerald-100 text-emerald-700',
  booking_cancelled: 'bg-slate-200 text-slate-600',
};

function ilYA(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "a l instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return jours <= 1 ? 'hier' : `il y a ${jours} jours`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const setMode = useMode((s) => s.setMode);
  const [ouvert, setOuvert] = useState(false);
  const [vuLe, setVuLe] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);

  // localStorage n existe pas au rendu serveur : on ne lit qu apres montage,
  // sinon le HTML rendu cote serveur et cote client divergent.
  useEffect(() => setVuLe(lireDerniereVue()), []);

  const { data } = useQuery({
    queryKey: ['notifications-feed'],
    queryFn: () => api.notificationFeed(),
    enabled: !!user,
    // Un intervalle court userait le service gratuit, qui s endort ; une minute
    // suffit largement pour une cloche.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Fermeture au clic exterieur et a la touche Echap.
  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) setOuvert(false);
    };
    const auClavier = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('mousedown', auClic);
    document.addEventListener('keydown', auClavier);
    return () => {
      document.removeEventListener('mousedown', auClic);
      document.removeEventListener('keydown', auClavier);
    };
  }, [ouvert]);

  if (!user) return null;

  const items: NotificationItem[] = data?.items ?? [];
  const nouvelles = items.filter((i) => new Date(i.createdAt).getTime() > vuLe).length;
  const modesDisponibles = modesOf(user);

  /**
   * /besoins n affiche pas la meme chose selon le mode : les demandes de sa
   * zone en hote, ses propres recherches en voyageur. Suivre une notification
   * sans aligner le mode menerait donc a un ecran ou l evenement est invisible.
   */
  const suivre = (n: NotificationItem) => {
    if (modesDisponibles.includes(n.audience)) setMode(n.audience);
    setOuvert(false);
  };

  const basculer = () => {
    const prochain = !ouvert;
    setOuvert(prochain);
    if (prochain) {
      // Ouvrir vaut consultation : la pastille retombe.
      const maintenant = Date.now();
      window.localStorage.setItem(CLE_VU, String(maintenant));
      setVuLe(maintenant);
    }
  };

  return (
    <div className="relative" ref={conteneur}>
      <button
        onClick={basculer}
        aria-label={nouvelles > 0 ? `Notifications, ${nouvelles} nouvelle(s)` : 'Notifications'}
        aria-expanded={ouvert}
        className="relative p-2 rounded-bledi-sm text-slate hover:bg-cloud"
      >
        <Bell className="w-5 h-5" />
        {nouvelles > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-bledi-gold text-white text-[11px] font-semibold">
            {nouvelles > 9 ? '9+' : nouvelles}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 mt-2 w-[min(92vw,22rem)] bg-white rounded-bledi shadow-bledi border border-cloud overflow-hidden">
          <div className="px-4 py-3 border-b border-cloud flex items-baseline justify-between">
            <span className="font-display font-semibold text-charcoal">Notifications</span>
            {data?.actionCount ? (
              <span className="text-xs text-slate">{data.actionCount} en attente</span>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="w-8 h-8 text-cloud mx-auto mb-2" />
              <p className="text-sm text-slate">Rien ne vous attend pour le moment.</p>
            </div>
          ) : (
            <ul className="max-h-[26rem] overflow-y-auto divide-y divide-cloud">
              {items.map((n) => {
                const Icone = ICONES[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <Link
                      href={n.link}
                      onClick={() => suivre(n)}
                      className="flex gap-3 px-4 py-3 hover:bg-cream group"
                    >
                      <span
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          TEINTES[n.type] ?? 'bg-cloud text-slate'
                        }`}
                      >
                        <Icone className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-charcoal truncate">{n.title}</span>
                          {n.actionRequired && (
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-bledi-gold font-semibold">
                              a faire
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-slate mt-0.5 line-clamp-2">{n.body}</span>
                        <span className="block text-[11px] text-slate/70 mt-1">
                          {n.audience === 'owner' ? 'Mode hote' : 'Mode voyageur'} · {ilYA(n.createdAt)}
                        </span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-cloud group-hover:text-slate shrink-0 mt-1" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
