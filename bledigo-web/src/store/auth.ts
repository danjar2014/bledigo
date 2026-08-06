'use client';

import { create } from 'zustand';
import { api, readTokens, writeTokens } from '@/lib/api';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'traveler' | 'owner' | 'agency' | 'admin' | 'agent' | 'support';
  avatarUrl?: string | null;
  [key: string]: any;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (dto: Record<string, unknown>) => Promise<User>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  hydrate: async () => {
    if (!readTokens()) {
      set({ user: null, loading: false });
      return;
    }
    try {
      set({ user: await api.me(), loading: false });
    } catch {
      writeTokens(null);
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.login({ email, password });
    writeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ user: res.user, loading: false });
    return res.user;
  },

  register: async (dto) => {
    const res = await api.register(dto);
    writeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ user: res.user, loading: false });
    return res.user;
  },

  logout: () => {
    writeTokens(null);
    set({ user: null, loading: false });
  },
}));
