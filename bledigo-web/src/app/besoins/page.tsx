'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useMode, modesOf } from '@/store/mode';
import MyReverseSearches from '@/components/MyReverseSearches';
import OwnerRequests from '@/components/OwnerRequests';
import PendingCounters from '@/components/PendingCounters';
import { Spinner } from '@/components/ui';

/**
 * Deux lectures de la meme page :
 *  - voyageur : ses propres demandes, modifiables et retirables ;
 *  - hote     : les demandes de sa zone (consomme un credit).
 *
 * Il n existe volontairement aucune liste publique des demandes : elles
 * exposent les dates de sejour et le budget du voyageur.
 */
export default function BesoinsPage() {
  const { user, loading } = useAuth();
  const mode = useMode((s) => s.mode);

  if (loading) return <Spinner />;

  if (!user) {
    return (
      <main className="min-h-screen bg-cream">
        <div className="container mx-auto px-4 py-16">
          <div className="bg-white rounded-bledi shadow-bledi p-10 text-center max-w-lg mx-auto">
            <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
              Recherche inversee
            </h1>
            <p className="text-slate mb-5">
              Publiez votre besoin et laissez les proprietaires de la region vous faire des offres.
              Connectez-vous pour commencer.
            </p>
            <Link href="/connexion" className="btn-primary inline-block">
              Se connecter
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const available = modesOf(user);
  const effectiveMode = available.includes(mode) ? mode : available[0] ?? 'traveler';

  if (effectiveMode === 'owner') {
    return (
      <main className="min-h-screen bg-cream">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-display font-bold text-charcoal mb-1">
            Demandes de ma zone
          </h1>
          <p className="text-slate mb-6">
            Les voyageurs publient leur besoin, vous leur proposez vos logements.
          </p>
          <PendingCounters />
          <OwnerRequests />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">Mes demandes</h1>
            <p className="text-slate">
              Publiez votre besoin, les proprietaires viennent a vous avec leurs offres.
            </p>
          </div>
          <Link href="/besoins/nouvelle" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Publier un besoin
          </Link>
        </div>

        <MyReverseSearches />
      </div>
    </main>
  );
}
