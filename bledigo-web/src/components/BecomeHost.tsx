'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Wallet, Users } from 'lucide-react';
import { usePreferences } from '@/store/preferences';

const ARGUMENTS = [
  {
    icon: Wallet,
    title: 'Paiement garanti',
    body: 'Les fonds sont bloques a la reservation et vous sont verses apres la validation du voyageur.',
  },
  {
    icon: Users,
    title: 'Voyageurs verifies',
    body: 'Chaque voyageur dispose d un passeport de confiance : historique, notes et incidents.',
  },
  {
    icon: ShieldCheck,
    title: 'Litiges arbitres',
    body: 'En cas de desaccord, notre equipe tranche sur la base des preuves deposees par les deux parties.',
  },
];

export default function BecomeHost() {
  const t = usePreferences((s) => s.t);

  return (
    <section className="bg-bledi-blue text-white">
      <div className="container mx-auto px-4 py-14 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-block text-xs uppercase tracking-[0.18em] text-bledi-red font-semibold border-l-2 border-bledi-red pl-3 mb-4">
            BlediGo · Proprietaires
          </div>
          <h2 className="text-3xl font-display font-bold mb-3">{t('home.host.title')}</h2>
          <p className="text-white/80 mb-6 leading-relaxed">{t('home.host.body')}</p>

          <ul className="space-y-4 mb-8">
            {ARGUMENTS.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.title} className="flex gap-3">
                  <Icon className="w-5 h-5 text-bledi-red shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-white/70">{a.body}</div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href="/proprietaire/annonces/nouvelle"
            className="inline-block bg-bledi-red text-white px-6 py-3 rounded-bledi-sm font-medium
                       hover:scale-[1.02] transition-transform"
          >
            {t('home.host.cta')}
          </Link>
          <p className="text-sm text-white/60 mt-3">{t('home.host.note')}</p>
        </div>

        <div className="relative h-72 lg:h-96 rounded-bledi overflow-hidden shadow-bledi-hover">
          <Image
            src="https://picsum.photos/seed/bledigo-host/900/700"
            alt=""
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
