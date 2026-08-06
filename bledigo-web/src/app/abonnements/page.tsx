'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Spinner, ErrorBox } from '@/components/ui';
import { money } from '@/lib/format';

const LABELS: Record<string, string> = {
  owner_pro: 'Pro',
  owner_premium: 'Premium',
  agency: 'Agence',
};

export default function AbonnementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: ['plans'], queryFn: () => api.plans() });
  const { data: mine } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => api.mySubscriptions(),
    enabled: !!user,
  });

  const subscribe = useMutation({
    mutationFn: (type: string) => api.subscribe(type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] }),
  });

  const activeType = mine?.find((s: any) => s.status === 'active')?.type;

  if (isLoading) return <Spinner />;
  if (error) return <main className="container mx-auto px-4 py-10"><ErrorBox error={error} /></main>;

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-2">Abonnements proprietaires</h1>
        <p className="text-slate mb-8">Plus de visibilite, plus de reservations.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {data?.map((plan: any) => {
            const isActive = activeType === plan.type;
            return (
              <div
                key={plan.type}
                className={`bg-white rounded-bledi p-6 shadow-bledi border-2 ${
                  isActive ? 'border-bledi-gold' : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-bledi-gold" />
                  <span className="font-display font-bold text-xl">{LABELS[plan.type] || plan.type}</span>
                </div>
                <div className="font-accent font-bold text-3xl text-charcoal mb-4">
                  {money(plan.price, plan.currency)}
                  <span className="text-base text-slate font-body font-normal"> / mois</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-slate">
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!user ? (
                  <a href="/connexion" className="btn-secondary w-full block text-center">
                    Se connecter
                  </a>
                ) : isActive ? (
                  <div className="text-center text-emerald-700 font-medium py-3">Abonnement actif</div>
                ) : (
                  <button
                    onClick={() => subscribe.mutate(plan.type)}
                    disabled={subscribe.isPending}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {subscribe.isPending ? '...' : 'Choisir ce plan'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
