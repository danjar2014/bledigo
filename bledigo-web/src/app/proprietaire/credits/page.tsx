'use client';

import Link from 'next/link';
import { Gift, ArrowRight } from 'lucide-react';
import RequireAuth from '@/components/RequireAuth';

/**
 * Boutique de credits mise en sommeil.
 *
 * Aucun paiement n est encaissable pendant la phase d amorcage : afficher une
 * boutique qui ne prend pas d argent decredibilise plus qu elle ne rapporte.
 * Le composant OwnerCreditsPage reste dans le depot, pret a etre rebranche
 * avec PAIEMENT_EN_LIGNE.
 */
export default function CreditsPage() {
  return (
    <RequireAuth roles={['owner', 'agency']}>
      <main className="min-h-screen bg-cream py-12">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="bg-white rounded-bledi shadow-bledi p-8 text-center">
            <Gift className="w-10 h-10 text-bledi-red mx-auto mb-3" />
            <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
              Tout est offert pendant le lancement
            </h1>
            <p className="text-slate mb-6">
              Vous n avez rien a acheter : consulter les demandes des voyageurs de votre zone et y
              repondre est gratuit et illimite. Nous vous previendrons bien avant que cela change.
            </p>
            <Link href="/besoins" className="btn-primary inline-flex items-center gap-2">
              Voir les demandes de ma zone
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
