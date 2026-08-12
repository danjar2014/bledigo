import Link from 'next/link';
import { Shield, Mail, Phone } from 'lucide-react';
import SeoLinks from '@/components/SeoLinks';

const NAVIGATION = [
  { href: '/', label: 'Accueil' },
  { href: '/recherche', label: 'Rechercher' },
  { href: '/carte', label: 'Carte' },
  { href: '/besoins', label: 'Recherche inversee' },
  { href: '/abonnements', label: 'Abonnements' },
];

const DESTINATIONS = [
  { slug: 'tunis', label: 'Tunis' },
  { slug: 'djerba', label: 'Djerba' },
  { slug: 'hammamet', label: 'Hammamet' },
  { slug: 'sousse', label: 'Sousse' },
  { slug: 'monastir', label: 'Monastir' },
];

const TRAVELERS = [
  { href: '/recherche', label: 'Rechercher un logement' },
  { href: '/besoins/nouvelle', label: 'Publier un besoin' },
  { href: '/reservations', label: 'Mes reservations' },
];

const OWNERS = [
  { href: '/proprietaire/annonces/nouvelle', label: 'Publier une annonce' },
  { href: '/proprietaire', label: 'Espace proprietaire' },
];

export default function Footer() {
  return (
    <footer className="mt-16">
      <SeoLinks />

      <div className="bg-charcoal text-white/70">
        <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-2 lg:grid-cols-5 text-sm">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 font-display font-bold text-lg text-white mb-2">
              <Shield className="w-5 h-5 text-bledi-gold" />
              BlediGo
            </div>
            <p className="mb-4">
              La reference de la location de logements en Tunisie. Reservez en confiance.
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-bledi-gold" />
                contact@bledigo.tn
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-bledi-gold" />
                +216 70 000 000
              </li>
            </ul>
          </div>

          <div>
            <div className="text-white font-medium mb-3">Navigation</div>
            <ul className="space-y-1.5">
              {NAVIGATION.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-white font-medium mb-3">Destinations</div>
            <ul className="space-y-1.5">
              {DESTINATIONS.map((d) => (
                <li key={d.slug}>
                  <Link href={`/villes/${d.slug}`} className="hover:text-white transition-colors">
                    {d.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-white font-medium mb-3">Voyageurs</div>
            <ul className="space-y-1.5">
              {TRAVELERS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-white font-medium mb-3">Proprietaires</div>
            <ul className="space-y-1.5">
              {OWNERS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span>© {new Date().getFullYear()} BlediGo. Tous droits reserves.</span>
            <span className="flex items-center gap-2 text-white/60">
              <Shield className="w-3.5 h-3.5 text-bledi-gold" />
              Annonces verifiees · Contact direct avec l hote · Sans commission
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
