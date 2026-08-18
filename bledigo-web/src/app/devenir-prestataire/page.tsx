'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { Car, Sparkles, ShieldCheck, Check, Phone } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * Candidature d une entreprise pour travailler avec BlediGo.
 *
 * C etait la piece manquante : l administration savait creer un compte
 * prestataire, mais aucune societe ne pouvait le demander. La seule porte
 * d entree etait un appel telephonique.
 *
 * La page dit franchement ce qui suit l envoi : une verification humaine, puis
 * des identifiants transmis par telephone. Promettre un acces immediat aurait
 * ete faux — un compte candidat ne peut pas se connecter.
 */
export default function DevenirPrestataire() {
  const [f, setF] = useState({
    type: 'location_voiture',
    legalForm: 'societe',
    companyName: '',
    registrationNumber: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    serviceRadiusKm: '30',
    description: '',
  });
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }));

  const envoyer = useMutation({
    mutationFn: () =>
      api.applyAsProvider({
        type: f.type,
        legalForm: f.legalForm,
        companyName: f.companyName,
        registrationNumber: f.registrationNumber || undefined,
        email: f.email,
        firstName: f.firstName,
        lastName: f.lastName,
        phone: f.phone,
        city: f.city || undefined,
        serviceRadiusKm: Number(f.serviceRadiusKm) || 30,
        description: f.description || undefined,
      }),
  });

  const individuel = f.legalForm === 'individuel' && f.type === 'menage';

  const complet =
    f.companyName && f.email && f.firstName && f.lastName && f.phone && f.city;

  if (envoyer.isSuccess) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-bledi shadow-bledi p-8 max-w-lg text-center">
          <Check className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="font-display font-semibold text-xl mb-2">Demande enregistree</h1>
          <p className="text-slate">
            Nous verifions vos informations, puis nous vous appelons au{' '}
            <strong>{f.phone}</strong> pour vous transmettre vos identifiants de connexion.
          </p>
          <p className="text-sm text-slate mt-3">
            Votre compte n est pas encore actif : il le devient une fois cette verification faite.
          </p>
          <Link href="/" className="btn-primary inline-block mt-5">
            Retour a l accueil
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-2">
          Travailler avec BlediGo
        </h1>
        <p className="text-slate mb-6">
          Vous louez des voitures, ou vous assurez le menage et l entretien de logements ? Les
          voyageurs et les hotes de BlediGo ont besoin de vous.
        </p>

        <div className="grid md:grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => set({ type: 'location_voiture', legalForm: 'societe' })}
            className={`text-left p-4 rounded-bledi border-2 transition-all ${
              f.type === 'location_voiture'
                ? 'border-bledi-blue bg-white'
                : 'border-cloud bg-white/60 hover:border-slate'
            }`}
          >
            <Car className="w-6 h-6 text-bledi-blue mb-2" />
            <p className="font-medium text-charcoal">Agence de location de voitures</p>
            <p className="text-sm text-slate mt-1">
              Vos vehicules sont proposes aux voyageurs qui viennent de reserver un logement pres
              de chez vous. Vous gerez votre flotte, vos tarifs et vos disponibilites.
            </p>
          </button>

          <button
            onClick={() => set({ type: 'menage' })}
            className={`text-left p-4 rounded-bledi border-2 transition-all ${
              f.type === 'menage'
                ? 'border-bledi-blue bg-white'
                : 'border-cloud bg-white/60 hover:border-slate'
            }`}
          >
            <Sparkles className="w-6 h-6 text-bledi-red mb-2" />
            <p className="font-medium text-charcoal">Menage et entretien</p>
            <p className="text-sm text-slate mt-1">
              Les hotes des logements autour de vous vous sollicitent directement entre deux
              sejours. Vous acceptez ou refusez chaque intervention.
            </p>
          </button>
        </div>


        {/* La forme juridique n apparait que pour le menage : louer des
            vehicules suppose une entreprise, proposer ce choix serait offrir une
            option que le serveur refuse. */}
        {f.type === 'menage' && (
          <div className="bg-white rounded-bledi shadow-bledi p-4 mb-6">
            <p className="font-medium text-charcoal mb-1">Vous etes</p>
            <p className="text-sm text-slate mb-3">
              Le menage n est pas reserve aux societes : vous pouvez vous inscrire a titre
              personnel.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                ['individuel', 'Une personne, a mon compte'],
                ['societe', 'Une societe'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => set({ legalForm: v })}
                  className={`px-3 py-2 rounded-bledi-sm text-sm font-medium border-2 transition-all ${
                    f.legalForm === v
                      ? 'border-bledi-blue text-bledi-blue'
                      : 'border-cloud text-slate hover:border-slate'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dire le processus AVANT le formulaire : une entreprise qui remplit
            dix champs pour decouvrir ensuite qu elle doit attendre un appel a
            de bonnes raisons de se sentir menee en bateau. */}
        <div className="bg-white rounded-bledi shadow-bledi p-4 mb-6">
          <p className="font-medium text-charcoal flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-bledi-blue" />
            Comment ca se passe
          </p>
          <ol className="text-sm text-slate space-y-1 list-decimal list-inside">
            <li>Vous remplissez ce formulaire.</li>
            <li>
              {individuel
                ? 'Nous verifions votre identite — une piece d identite suffit.'
                : 'Nous verifions votre statut d entreprise — registre de commerce ou equivalent.'}
            </li>
            <li>
              Nous vous appelons pour vous transmettre vos identifiants. Votre compte devient actif
              a ce moment-la, pas avant.
            </li>
            <li>Vous vous connectez et vous gerez votre activite depuis votre espace.</li>
          </ol>
          <p className="text-xs text-slate mt-3">
            L inscription et l utilisation sont gratuites pendant la phase de lancement. Aucun
            montant ne transite par BlediGo : vous vous entendez directement avec le client.
          </p>
        </div>

        <div className="bg-white rounded-bledi shadow-bledi p-4">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input-bledi"
              placeholder={individuel ? 'Vos nom et prenom *' : 'Raison sociale *'}
              value={f.companyName}
              onChange={(e) => set({ companyName: e.target.value })}
            />
            <input
              className="input-bledi"
              placeholder={individuel ? 'Numero de carte d identite' : 'Registre de commerce'}
              value={f.registrationNumber}
              onChange={(e) => set({ registrationNumber: e.target.value })}
            />
            <input
              className="input-bledi"
              placeholder={individuel ? 'Prenom *' : 'Prenom du responsable *'}
              value={f.firstName}
              onChange={(e) => set({ firstName: e.target.value })}
            />
            <input
              className="input-bledi"
              placeholder={individuel ? 'Nom *' : 'Nom du responsable *'}
              value={f.lastName}
              onChange={(e) => set({ lastName: e.target.value })}
            />
            <input
              className="input-bledi"
              placeholder="Adresse email *"
              value={f.email}
              onChange={(e) => set({ email: e.target.value })}
            />
            <input
              className="input-bledi"
              placeholder="Telephone * (nous vous appelons dessus)"
              value={f.phone}
              onChange={(e) => set({ phone: e.target.value })}
            />
            <input
              className="input-bledi"
              placeholder="Ville *"
              value={f.city}
              onChange={(e) => set({ city: e.target.value })}
            />
            <input
              className="input-bledi"
              type="number"
              placeholder="Rayon d intervention en km"
              value={f.serviceRadiusKm}
              onChange={(e) => set({ serviceRadiusKm: e.target.value })}
            />
          </div>
          <textarea
            className="input-bledi w-full mt-3"
            rows={3}
            placeholder="Quelques mots sur votre activite"
            value={f.description}
            onChange={(e) => set({ description: e.target.value })}
          />

          <button
            disabled={!complet || envoyer.isPending}
            onClick={() => envoyer.mutate()}
            className="btn-primary mt-4 disabled:opacity-50"
          >
            {envoyer.isPending ? 'Envoi...' : 'Envoyer ma demande'}
          </button>

          {!complet && (
            <p className="text-xs text-slate mt-2">
              Les champs marques d une etoile sont necessaires. Le telephone en particulier : c est
              par la que nous vous repondons.
            </p>
          )}
          {envoyer.error ? (
            <p className="text-sm text-red-600 mt-3">{(envoyer.error as any).message}</p>
          ) : null}
        </div>

        <p className="text-sm text-slate mt-6 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Deja un compte ?{' '}
          <Link href="/connexion" className="underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
