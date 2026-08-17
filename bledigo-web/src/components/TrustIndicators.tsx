'use client';

import { Shield, ClipboardCheck, MapPin, Clock, Lock, Award } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Ce que la plateforme fait REELLEMENT.
 *
 * Trois promesses ont ete retirees d ici parce que rien ne les tenait : des
 * agents verifiant les logements (le modele a ete abandonne, il n a jamais
 * existe de compte agent), des photos prises par des controleurs terrain
 * (aucun code ne certifie une photo), et un GPS verifie (les coordonnees sont
 * celles de la ville declaree, `dto.latitude ?? locality.lat`).
 *
 * Une promesse invendable est pire qu une promesse absente : le voyageur qui
 * la decouvre fausse cesse de croire les autres, y compris les vraies.
 */
const indicators = [
  { icon: Shield, title: 'Fraude surveillee', desc: 'Refus repetes et absences declarees a tort entrainent des sanctions' },
  { icon: ClipboardCheck, title: 'Sejours valides', desc: 'Le voyageur confirme sur place ce que l annonce promettait' },
  { icon: MapPin, title: 'Situe sur la carte', desc: 'Chaque annonce est placee dans sa ville, visible avant de reserver' },
  { icon: Clock, title: 'Reponse rapide', desc: 'L hote accepte, vous le contactez' },
  { icon: Lock, title: 'Sans commission', desc: 'Vous reglez directement avec l hote' },
  { icon: Award, title: 'Certification', desc: 'Bronze, Silver, Gold, Diamond' },
];

export default function TrustIndicators() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
            Pourquoi choisir <span className="text-bledi-blue">BlediGo</span> ?
          </h2>
          <p className="text-slate max-w-2xl mx-auto">
            Nous avons reinvente la location en Tunisie. Plus d arnaques, plus de mauvaises surprises.
            Juste la confiance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {indicators.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex items-start gap-4 p-6 rounded-bledi bg-cream hover:bg-bledi-blue/5 transition-colors"
            >
              <div className="w-12 h-12 rounded-bledi-sm bg-bledi-blue/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-bledi-blue" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-charcoal mb-1">{item.title}</h3>
                <p className="text-sm text-slate">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
