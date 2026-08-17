'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Shield } from 'lucide-react';
import GoogleButton from '@/components/GoogleButton';

/**
 * Raccourci de developpement uniquement.
 *
 * Ces trois adresses sont FERMEES en production : le semis leur donne une
 * empreinte inutilisable a chaque demarrage, et les comptes de recette vivent
 * sur les adresses de DEMO_EMAIL_OWNER / DEMO_EMAIL_TRAVELER. Le bloc y
 * remplissait donc un mot de passe qui echoue, tout en annoncant au monde
 * l existence d un compte administrateur — le pire des deux cotes.
 *
 * En local le semis retombe bien sur Password123!, d ou le raccourci conserve.
 * NODE_ENV est fige au build par Next.js : en production la condition est
 * fausse a la compilation et le bloc disparait du bundle, adresses comprises.
 */
const EN_DEVELOPPEMENT = process.env.NODE_ENV === 'development';

const DEMO = [
  { role: 'Voyageur', email: 'traveler@bledigo.com' },
  { role: 'Proprietaire', email: 'owner@bledigo.com' },
  { role: 'Admin', email: 'admin@bledigo.com' },
];

const HOME_BY_ROLE: Record<string, string> = {
  traveler: '/reservations',
  owner: '/proprietaire',
  agency: '/proprietaire',
  admin: '/admin',
  support: '/admin',
  // Sans cette entree, une agence tombait sur l accueil apres connexion et
  // devait deviner l existence de son espace.
  provider: '/prestataire',
};

export default function ConnexionPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      router.push(HOME_BY_ROLE[user.role] || '/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-bledi shadow-bledi p-8">
          <div className="flex items-center gap-2 font-display font-bold text-2xl text-bledi-blue mb-6">
            <Shield className="w-6 h-6 text-bledi-gold" />
            Connexion
          </div>

          <GoogleButton onError={setError} />


          <form onSubmit={submit}>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              className="input-bledi mb-4"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input
              type="password"
              required
              className="input-bledi mb-4"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {error && <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-4">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-sm text-slate mt-4 text-center">
            Pas encore de compte ?{' '}
            <Link href="/inscription" className="text-bledi-blue font-medium">
              Inscription
            </Link>
          </p>
        </div>

        {EN_DEVELOPPEMENT && (
          <div className="bg-white/60 rounded-bledi p-4 mt-4 text-sm">
            <div className="font-medium text-charcoal mb-2">Comptes de demonstration (developpement)</div>
            <div className="space-y-1">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={() => setForm({ email: d.email, password: 'Password123!' })}
                  className="w-full flex justify-between items-center text-left px-3 py-2 rounded-bledi-sm hover:bg-white"
                >
                  <span className="text-slate">{d.role}</span>
                  <span className="text-charcoal font-mono text-xs">{d.email}</span>
                </button>
              ))}
            </div>
            <div className="text-xs text-slate mt-2">
              Mot de passe : <span className="font-mono">Password123!</span> - cliquez pour remplir
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
