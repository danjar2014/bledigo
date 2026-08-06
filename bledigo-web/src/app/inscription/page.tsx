'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Shield } from 'lucide-react';

export default function InscriptionPage() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'traveler',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register(form);
      router.push(user.role === 'owner' ? '/proprietaire' : '/recherche');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-bledi shadow-bledi p-8">
        <div className="flex items-center gap-2 font-display font-bold text-2xl text-bledi-blue mb-6">
          <Shield className="w-6 h-6 text-bledi-gold" />
          Creer un compte
        </div>

        <form onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prenom</label>
              <input
                required
                className="input-bledi"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nom</label>
              <input
                required
                className="input-bledi"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

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
            minLength={8}
            className="input-bledi mb-1"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <div className="text-xs text-slate mb-4">8 caracteres minimum</div>

          <label className="block text-sm font-medium mb-1">Je suis</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              ['traveler', 'Voyageur'],
              ['owner', 'Proprietaire'],
              ['agency', 'Agence'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setForm({ ...form, role: value })}
                className={`px-3 py-2 rounded-bledi-sm text-sm font-medium border-2 transition-all ${
                  form.role === value
                    ? 'border-bledi-blue bg-bledi-blue text-white'
                    : 'border-cloud text-slate hover:border-bledi-blue'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-4">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Creation...' : 'Creer mon compte'}
          </button>
        </form>

        <p className="text-sm text-slate mt-4 text-center">
          Deja inscrit ?{' '}
          <Link href="/connexion" className="text-bledi-blue font-medium">
            Connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
