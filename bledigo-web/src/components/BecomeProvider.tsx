'use client';

import Link from 'next/link';
import { Car, Sparkles, ArrowRight } from 'lucide-react';

/**
 * Appel aux prestataires, sur la page d accueil.
 *
 * Le lien existait en pied de page, la ou personne ne regarde. Une femme de
 * menage ou une agence de location n a aucune raison de fouiller un site de
 * location de logements pour deviner qu on l attend.
 *
 * Le menage est nomme au singulier ET au pluriel — « une personne ou une
 * societe » — parce que c est exactement le malentendu a lever : ce n est pas
 * reserve aux entreprises.
 */
export default function BecomeProvider() {
  return (
    <section className="bg-white border-t border-cloud">
      <div className="container mx-auto px-4 py-14">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-charcoal mb-3">
            Vous travaillez autour du sejour ? Faites-vous connaitre.
          </h2>
          <p className="text-slate mb-8">
            Les hotes cherchent quelqu un pour le menage entre deux sejours. Les voyageurs
            cherchent une voiture en arrivant. Sur BlediGo, ils vous trouvent — et vous vous
            entendez directement avec eux, sans commission.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-bledi border-2 border-cloud p-5">
            <Sparkles className="w-7 h-7 text-bledi-red mb-3" />
            <h3 className="font-display font-semibold text-lg text-charcoal">
              Menage et entretien
            </h3>
            <p className="text-sm text-slate mt-2">
              <strong>Une personne a son compte comme une societe.</strong> Les hotes des logements
              autour de vous vous sollicitent entre deux sejours ; vous acceptez ou refusez chaque
              intervention, et vous convenez du tarif avec eux.
            </p>
          </div>

          <div className="rounded-bledi border-2 border-cloud p-5">
            <Car className="w-7 h-7 text-bledi-blue mb-3" />
            <h3 className="font-display font-semibold text-lg text-charcoal">
              Location de voitures
            </h3>
            <p className="text-sm text-slate mt-2">
              <strong>Reserve aux agences.</strong> Vos vehicules sont proposes aux voyageurs qui
              viennent de reserver pres de chez vous. Vous gerez votre flotte, vos tarifs et vos
              disponibilites.
            </p>
          </div>
        </div>

        <Link
          href="/devenir-prestataire"
          className="btn-primary inline-flex items-center gap-2 mt-8"
        >
          Proposer mes services
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-slate mt-3">
          Gratuit pendant la phase de lancement. Nous verifions votre activite avant d ouvrir
          votre compte.
        </p>
      </div>
    </section>
  );
}
