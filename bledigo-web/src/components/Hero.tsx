'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative h-[620px] lg:h-[700px] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1590146758445-6d9b8b6ea3d1?auto=format&fit=crop&w=2000&q=80"
          alt="Sidi Bou Said, Tunisie"
          fill
          className="object-cover"
          priority
          unoptimized
        />
                {/* Voile en ENCRE, plus en bleu : un voile bleu sur une palette sable
            donne un gris verdatre et le blanc du texte y perd son contraste. */}
        <div className="absolute inset-0 bg-gradient-to-b from-bledi-blue/85 via-bledi-blue/60 to-bledi-blue/30" />
      </div>

      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          {/* Le badge dit d ou vient le service avant meme le titre : c est ce
              qui distingue BlediGo d une plateforme internationale de plus. */}
          <span className="inline-flex items-center gap-2 bg-bledi-red text-white text-xs font-semibold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-6">
            Fait pour la Tunisie
          </span>

          {/* Taille en clamp plutot qu en paliers : entre le telephone et un
              grand ecran il n y a pas trois tailles mais un continuum, et les
              sauts se voyaient sur les formats intermediaires. */}
          <h1
            className="font-display font-bold text-white leading-[0.95] mb-6"
            style={{ fontSize: 'clamp(48px, 7vw, 96px)' }}
          >
            Reservez en <span className="text-bledi-red">confiance</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8">
            La location en Tunisie en direct avec le proprietaire. Annonces verifiees,
            emplacements controles, aucune commission.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/recherche"
              className="bg-bledi-red text-white text-lg px-8 py-4 rounded-bledi-sm font-medium
                         transition-all duration-200 hover:scale-[1.02] hover:shadow-bledi-hover
                         active:scale-[0.98] inline-block"
            >
              Decouvrir les logements
            </Link>
            {/* Contour blanc plutot que verre depoli : sur une photo claire le
                fond translucide disparaissait, et le bouton avec lui. */}
            <Link href="/besoins" className="btn-outline-light text-lg px-8 py-4 inline-block">
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
