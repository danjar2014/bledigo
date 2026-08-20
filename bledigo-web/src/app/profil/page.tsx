'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageCircle, Heart, Check, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/store/auth';
import { Spinner } from '@/components/ui';

/**
 * Mon profil.
 *
 * Le canal de contact existait en base et gouvernait deja l affichage des
 * coordonnees apres acceptation — mais AUCUN ecran ne permettait de le choisir.
 * Le reglage etait donc inatteignable : tout le monde restait sur « telephone »
 * par defaut, quel que soit son usage reel.
 *
 * Il vit sur le COMPTE et non sur l annonce, deliberement : un hote qui a trois
 * logements le regle une fois. C est aussi pour cela que la page s adresse a
 * tout le monde — un voyageur est joint de la meme facon par son hote.
 */
function Profil() {
  const { user, hydrate } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    contactChannel: 'phone',
    whatsappNumber: '',
  });

  // Le compte est deja charge par le store : on s en sert comme source, plutot
  // que de refaire un appel qui rendrait exactement la meme chose.
  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      contactChannel: user.contactChannel ?? 'phone',
      whatsappNumber: user.whatsappNumber ?? '',
    });
  }, [user]);

  const enregistrer = useMutation({
    mutationFn: () =>
      api.updateMe(user!.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        contactChannel: form.contactChannel,
        // Vide = on ne l envoie pas : le serveur refuse une chaine vide au
        // format numero, et l absence signifie « utilise mon numero principal ».
        whatsappNumber: form.whatsappNumber || undefined,
      }),
    onSuccess: async () => {
      // Rehydrater le store : sans cela l en-tete et les fiches de reservation
      // continueraient d afficher l ancien canal jusqu au prochain chargement.
      await hydrate();
      queryClient.invalidateQueries();
    },
  });

  if (!user) return <Spinner />;

  const surWhatsapp = form.contactChannel === 'whatsapp';
  /** Numero reellement utilise, replis compris — c est ce que verra l autre partie. */
  const numeroEffectif = surWhatsapp ? form.whatsappNumber || form.phone : form.phone;

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6 flex items-center gap-2">
          <UserRound className="w-7 h-7 text-bledi-red" />
          Mon profil
        </h1>

        <div className="bg-white rounded-bledi shadow-bledi p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm">
              Prenom
              <input
                className="input-bledi mt-1"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Nom
              <input
                className="input-bledi mt-1"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </label>
          </div>

          <label className="text-sm block mt-4">
            Telephone
            <input
              className="input-bledi mt-1"
              placeholder="+216 20 123 456"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>

          <p className="text-sm text-slate mt-2">
            {user.email} — l adresse ne se modifie pas ici : elle identifie le compte.
          </p>

          {/* ------------------------------------------- Canal de contact */}
          <div className="mt-6 pt-6 border-t border-cloud">
            <h2 className="font-display font-semibold text-charcoal mb-1">
              Comment souhaitez-vous etre joint ?
            </h2>
            <p className="text-sm text-slate mb-3">
              En paiement direct, les deux parties se contactent elles-memes une fois la demande
              acceptee. C est ce choix qui decide du bouton qu elles verront.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { code: 'phone', label: 'Telephone', icon: Phone, aide: 'Appel direct sur votre numero' },
                {
                  code: 'whatsapp',
                  label: 'WhatsApp',
                  icon: MessageCircle,
                  aide: 'Ouvre une conversation WhatsApp',
                },
              ].map((c) => {
                const actif = form.contactChannel === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setForm({ ...form, contactChannel: c.code })}
                    className={`flex items-start gap-3 p-4 rounded-bledi-sm text-left transition-all ${
                      actif
                        ? 'border-2 border-bledi-red bg-cream'
                        : 'border border-cloud bg-white hover:border-bledi-red'
                    }`}
                  >
                    <c.icon
                      className={`w-5 h-5 shrink-0 mt-0.5 ${actif ? 'text-bledi-red' : 'text-slate'}`}
                    />
                    <span>
                      <span className="block font-medium text-charcoal">{c.label}</span>
                      <span className="block text-xs text-slate mt-0.5">{c.aide}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {surWhatsapp && (
              <label className="text-sm block mt-3">
                Numero WhatsApp
                <input
                  className="input-bledi mt-1"
                  placeholder="laisser vide pour utiliser votre telephone"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                />
                {/* Beaucoup utilisent WhatsApp sur leur numero principal : le
                    repli evite d exiger une saisie qui serait la meme. */}
                <span className="text-xs text-slate">
                  Beaucoup utilisent WhatsApp sur leur numero principal. Vide, c est celui-ci qui
                  sera utilise.
                </span>
              </label>
            )}

            {/* Montrer le resultat plutot que de le decrire : c est exactement
                ce que l autre partie aura sous les yeux. */}
            <div className="mt-3 p-3 rounded-bledi-sm bg-cream text-sm">
              <span className="text-slate">Ce que verra l autre partie : </span>
              {numeroEffectif ? (
                <span className="font-medium text-charcoal">
                  {surWhatsapp ? 'WhatsApp ' : ''}
                  {numeroEffectif}
                </span>
              ) : (
                <span className="text-amber-800">
                  aucun numero — renseignez votre telephone, sans quoi personne ne pourra vous
                  joindre apres acceptation.
                </span>
              )}
            </div>
          </div>

          {enregistrer.error && (
            <p className="text-sm text-red-700 bg-red-50 rounded p-2 mt-4">
              {(enregistrer.error as Error).message}
            </p>
          )}

          <button
            onClick={() => enregistrer.mutate()}
            disabled={enregistrer.isPending}
            className="btn-primary w-full mt-6 disabled:opacity-50"
          >
            {enregistrer.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>

          {enregistrer.isSuccess && !enregistrer.isPending && (
            <p className="text-sm text-emerald-700 flex items-center gap-1.5 mt-3">
              <Check className="w-4 h-4" />
              Profil enregistre
            </p>
          )}
        </div>

        <Link
          href="/favoris"
          className="mt-4 bg-white rounded-bledi shadow-bledi p-4 flex items-center gap-3 hover:shadow-bledi-hover transition-shadow"
        >
          <Heart className="w-5 h-5 text-bledi-red fill-bledi-red" />
          <span className="font-medium text-charcoal">Mes favoris</span>
        </Link>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <Profil />
    </RequireAuth>
  );
}
