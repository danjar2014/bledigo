'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative h-[560px] lg:h-[640px] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1590146758445-6d9b8b6ea3d1?auto=format&fit=crop&w=2000&q=80"
          alt="Sidi Bou Said, Tunisie"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bledi-blue/80 via-bledi-blue/50 to-bledi-blue/20" />
      </div>

      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6">
            Reservez en <span className="text-bledi-gold">confiance</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8">
            La location en Tunisie en direct avec le proprietaire. Annonces verifiees,
            emplacements controles, aucune commission.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/recherche" className="btn-gold text-lg px-8 py-4 inline-block">
              Decouvrir les logements
            </Link>
            <Link
              href="/besoins"
              className="bg-white/20 backdrop-blur-sm text-white border-2 border-white/50 px-8 py-4 rounded-bledi-sm font-medium hover:bg-white/30 transition-all inline-block"
            >
              Publier mon besoin
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="absolute bottom-24 md:bottom-16 left-0 right-0"
        >
          <div className="flex justify-center gap-8 md:gap-16 text-white">
            {[
              ['500+', 'Logements certifies'],
              ['98%', 'Satisfaction client'],
              ['0', 'Arnaque toleree'],
            ].map(([value, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl md:text-4xl font-accent font-bold">{value}</div>
                <div className="text-sm text-white/80">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
