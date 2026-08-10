'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, Shield, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { photoOf, CERTIFICATIONS } from '@/lib/format';
import { useMoney } from '@/store/preferences';

export default function ListingCard({ listing }: { listing: any }) {
  const money = useMoney();
  const certification = CERTIFICATIONS[listing.certificationLevel] || CERTIFICATIONS.none;
  const trustScore = listing.trustScore ?? 50;

  return (
    <motion.div whileHover={{ y: -4 }}>
      <Link href={`/logements/${listing.slug || listing.id}`} className="card-bledi overflow-hidden group block">
        <div className="relative h-56 overflow-hidden">
          <Image
            src={photoOf(listing)}
            alt={listing.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            {listing.certificationLevel !== 'none' && (
              <span className={certification.className}>{certification.label}</span>
            )}
            {trustScore >= 90 && (
              <span className="bg-bledi-blue/90 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Superhost
              </span>
            )}
          </div>
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-sm font-accent font-semibold">
            {money(Number(listing.pricePerNight))}/nuit
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-display font-semibold text-lg text-charcoal mb-1 truncate">{listing.title}</h3>
          <div className="flex items-center gap-1 text-slate text-sm mb-2">
            <MapPin className="w-4 h-4" />
            <span>{listing.city}</span>
            {listing.distanceKm != null && (
              <span className="text-xs">- a {listing.distanceKm.toFixed(1)} km</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{listing.maxGuests}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-bledi-gold fill-bledi-gold" />
                <span className="font-medium text-charcoal">{trustScore}/100</span>
              </div>
            </div>
            <div className="text-xs text-slate">{listing.totalReviews || 0} avis verifies</div>
          </div>

          <div className="mt-3">
            <div className="h-2 bg-cloud rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  trustScore >= 75 ? 'bg-emerald-500' : trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${trustScore}%` }}
              />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
