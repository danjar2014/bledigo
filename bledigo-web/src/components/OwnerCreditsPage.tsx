'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Zap, Crown, Infinity as InfinityIcon, Check } from 'lucide-react';
import { api } from '@/lib/api';

/** Doit rester aligne avec CREDIT_PACKAGES du backend (reverse-search.service.ts). */
const packages = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 10,
    price: 29,
    icon: Zap,
    features: [
      '10 consultations de demandes',
      'Acces aux recherches actives',
      'Filtres de base',
      'Valable 30 jours',
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 50,
    price: 99,
    icon: Crown,
    features: [
      '50 consultations de demandes',
      'Acces prioritaire aux recherches',
      'Filtres avances',
      'Notifications instantanees',
      'Valable 90 jours',
    ],
    popular: true,
  },
  {
    id: 'unlimited',
    name: 'Illimite',
    credits: 9999,
    price: 299,
    icon: InfinityIcon,
    features: [
      'Consultations illimitees',
      'Acces VIP aux recherches',
      'Filtres avances',
      'Notifications instantanees',
      'Badge Pro sur votre profil',
      'Valable 1 an',
    ],
    popular: false,
  },
];

const STEPS = [
  { step: '1', title: 'Achetez des credits', desc: 'Choisissez le package adapte a votre activite' },
  { step: '2', title: 'Consultez les demandes', desc: 'Chaque consultation deduit 1 credit' },
  { step: '3', title: 'Envoyez vos offres', desc: 'Proposez vos biens aux voyageurs qualifies' },
];

export default function OwnerCreditsPage() {
  const [selectedPackage, setSelectedPackage] = useState('pro');
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .reverseSearchCredits()
      .then((c) => setCurrentCredits(c?.creditsRemaining ?? 0))
      .catch(() => setCurrentCredits(0));
  }, []);

  const selected = packages.find((p) => p.id === selectedPackage);

  async function purchase() {
    if (!selected || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await api.purchaseReverseSearchCredits(selected.id);
      setCurrentCredits(res?.creditsRemaining ?? currentCredits);
      setMessage(`Package ${selected.name} active. Credits disponibles : ${res?.creditsRemaining}.`);
    } catch (e: any) {
      setMessage(e?.message || 'Le paiement n a pas abouti.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-charcoal mb-2">
            Credits Recherche Inversee
          </h1>
          <p className="text-slate">
            Accedez aux demandes de location des voyageurs et envoyez vos offres personnalisees
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-bledi-blue text-white px-4 py-2 rounded-full text-sm">
            <CreditCard className="w-4 h-4" />
            Credits disponibles :{' '}
            <strong>{currentCredits === null ? '...' : currentCredits}</strong>
          </div>
        </div>

        <div className="bg-white rounded-bledi shadow-bledi p-6 mb-8">
          <h2 className="font-display font-bold mb-4">Comment ca marche ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((item) => (
              <div key={item.step} className="text-center p-4 bg-cream rounded-lg">
                <div className="w-10 h-10 rounded-full bg-bledi-blue text-white flex items-center justify-center font-bold mx-auto mb-2">
                  {item.step}
                </div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-slate">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const Icon = pkg.icon;
            const isSelected = selectedPackage === pkg.id;
            return (
              <motion.div
                key={pkg.id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedPackage(pkg.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedPackage(pkg.id)}
                className={`relative bg-white rounded-bledi shadow-bledi p-6 cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-bledi-blue shadow-bledi-hover' : 'hover:shadow-bledi-hover'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-bledi-red text-white text-xs font-bold px-3 py-1 rounded-full">
                    POPULAIRE
                  </div>
                )}

                <div className="text-center mb-6">
                  <Icon
                    className={`w-10 h-10 mx-auto mb-3 ${isSelected ? 'text-bledi-blue' : 'text-slate'}`}
                  />
                  <h3 className="text-xl font-display font-bold">{pkg.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{pkg.price} EUR</span>
                  </div>
                  <div className="text-sm text-slate mt-1">
                    {pkg.credits === 9999 ? 'Illimite' : `${pkg.credits} credits`}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div
                  className={`w-full py-3 rounded-bledi-sm font-medium text-center transition-all ${
                    isSelected ? 'bg-bledi-blue text-white' : 'bg-cloud text-slate'
                  }`}
                >
                  {isSelected ? 'Selectionne' : 'Choisir'}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={purchase}
            disabled={pending}
            className="btn-primary px-8 py-4 text-lg disabled:opacity-60"
          >
            <CreditCard className="w-5 h-5 inline mr-2" />
            {pending ? 'Traitement...' : `Payer ${selected?.price} EUR`}
          </button>
          {message && <p className="text-sm text-charcoal mt-3">{message}</p>}
          <p className="text-sm text-slate mt-3">
            Credits offerts pendant la phase de lancement · Aucun paiement requis
          </p>
        </div>
      </div>
    </div>
  );
}
