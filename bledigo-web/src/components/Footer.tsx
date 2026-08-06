import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white/70 mt-16">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-lg text-white mb-2">
            <Shield className="w-5 h-5 text-bledi-gold" />
            BlediGo
          </div>
          <p>La reference de la location de logements en Tunisie. Reservez en confiance.</p>
        </div>
        <div>
          <div className="text-white font-medium mb-2">Voyageurs</div>
          <ul className="space-y-1">
            <li><Link href="/recherche" className="hover:text-white">Rechercher un logement</Link></li>
            <li><Link href="/besoins" className="hover:text-white">Publier un besoin</Link></li>
            <li><Link href="/reservations" className="hover:text-white">Mes reservations</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-white font-medium mb-2">Proprietaires</div>
          <ul className="space-y-1">
            <li><Link href="/proprietaire/annonces/nouvelle" className="hover:text-white">Publier une annonce</Link></li>
            <li><Link href="/proprietaire" className="hover:text-white">Espace proprietaire</Link></li>
            <li><Link href="/abonnements" className="hover:text-white">Abonnements</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-white font-medium mb-2">Confiance</div>
          <ul className="space-y-1">
            <li>Photos certifiees par nos agents</li>
            <li>Paiement bloque jusqu a validation</li>
            <li>30 min pour verifier a l arrivee</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">
        BlediGo - demonstration locale
      </div>
    </footer>
  );
}
