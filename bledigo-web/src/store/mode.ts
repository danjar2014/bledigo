'use client';

import { create } from 'zustand';

/**
 * Mode d interface actif. Un meme compte peut etre proprietaire et voyageur :
 * le mode ne change aucun droit cote serveur, il ne fait qu adapter la
 * navigation et les ecrans par defaut.
 */
export type Mode = 'traveler' | 'owner';

const STORAGE_KEY = 'bledigo.mode';

function read(): Mode | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === 'traveler' || raw === 'owner' ? raw : null;
}

interface ModeState {
  mode: Mode;
  hydrated: boolean;
  hydrate: (fallback: Mode) => void;
  setMode: (mode: Mode) => void;
}

export const useMode = create<ModeState>((set) => ({
  mode: 'traveler',
  hydrated: false,

  hydrate: (fallback) => {
    const stored = read();
    set({ mode: stored ?? fallback, hydrated: true });
  },

  setMode: (mode) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, mode);
    set({ mode });
  },
}));

/** Modes reellement accessibles au compte, deduits des roles effectifs. */
export function modesOf(user: { role?: string; roles?: string[]; modes?: string[] } | null): Mode[] {
  if (!user) return [];
  const roles = user.modes ?? user.roles ?? (user.role ? [user.role] : []);
  const out: Mode[] = [];
  if (roles.includes('traveler')) out.push('traveler');
  if (roles.includes('owner') || roles.includes('agency')) out.push('owner');
  return out;
}
