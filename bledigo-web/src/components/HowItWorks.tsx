'use client';

import { Search, CreditCard, Key, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { icon: Search, step: '1', title: 'Recherchez', desc: 'Trouvez le logement ideal avec nos filtres avances et la carte interactive' },
  { icon: CreditCard, step: '2', title: 'Reservez', desc: 'Payez en toute securite via Stripe. Vos fonds sont proteges' },
  { icon: Key, step: '3', title: 'Arrivez', desc: 'Check-in numerique avec QR code. Le proprietaire confirme votre arrivee' },
  { icon: CheckCircle, step: '4', title: 'Validez', desc: '30 minutes pour verifier conformite, propreté et equipements' },
];

export default function HowItWorks() {
  return (
    <section className="py-16 bg-bledi-blue text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Comment ca <span className="text-bledi-gold">marche</span> ?
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto">
            Un processus simple, transparent et securise en 4 etapes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bledi-gold/20 flex items-center justify-center">
                <item.icon className="w-8 h-8 text-bledi-gold" />
              </div>
              <div className="text-5xl font-accent font-bold text-white/20 mb-2">{item.step}</div>
              <h3 className="text-xl font-display font-semibold mb-2">{item.title}</h3>
              <p className="text-white/70 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
