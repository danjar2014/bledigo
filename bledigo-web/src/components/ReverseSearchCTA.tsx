'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare } from 'lucide-react';

export default function ReverseSearchCTA() {
  return (
    <section className="py-16 bg-cream">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-bledi-blue to-charcoal rounded-bledi p-8 md:p-12 text-white text-center"
        >
          <div className="max-w-3xl mx-auto">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-bledi-gold/20 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-bledi-gold" />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              La recherche <span className="text-bledi-gold">inversee</span>
            </h2>
            <p className="text-white/80 text-lg mb-8">
              Publiez votre besoin et recevez des offres personnalisees de proprietaires et agences.
              Vous cherchez une villa a Djerba avec piscine ? Dites-le nous, ils viendront a vous.
            </p>
            <Link href="/besoins" className="btn-gold text-lg px-8 py-4 inline-flex items-center gap-2">
              Publier mon besoin
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
