'use client';

import { useEffect, useState } from 'react';
import { Star, ThumbsUp, Flag, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

interface Review {
  id: string;
  reviewer: { firstName: string; avatarUrl: string | null };
  rating: number;
  comment: string;
  createdAt: string;
  helpfulCount: number;
}

interface CriteriaAvg {
  cleanliness: number | null;
  accuracy: number | null;
  checkIn: number | null;
  communication: number | null;
  location: number | null;
  value: number | null;
}

interface ReviewsSectionProps {
  listingId: string;
  /** Donnees initiales (rendu serveur). Rechargees a chaque changement de tri/filtre. */
  avgRating?: number | string;
  totalReviews?: number;
  criteriaAvg?: Partial<CriteriaAvg>;
  breakdown?: Record<number, number>;
  reviews?: Review[];
}

const SORT_OPTIONS = [
  { key: 'newest', label: 'Plus recents' },
  { key: 'highest', label: 'Meilleures notes' },
  { key: 'lowest', label: 'Moins bonnes' },
  { key: 'helpful', label: 'Plus utiles' },
];

const CRITERIA: { key: keyof CriteriaAvg; label: string }[] = [
  { key: 'cleanliness', label: 'Proprete' },
  { key: 'accuracy', label: 'Precision' },
  { key: 'checkIn', label: 'Arrivee' },
  { key: 'communication', label: 'Communication' },
  { key: 'location', label: 'Emplacement' },
  { key: 'value', label: 'Rapport qualite/prix' },
];

export default function ReviewsSection({
  listingId,
  avgRating: initialAvg = 0,
  totalReviews: initialTotal = 0,
  criteriaAvg: initialCriteria = {},
  breakdown: initialBreakdown = {},
  reviews: initialReviews = [],
}: ReviewsSectionProps) {
  const [sortBy, setSortBy] = useState('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [data, setData] = useState({
    avgRating: initialAvg,
    total: initialTotal,
    criteriaAvg: initialCriteria as Partial<CriteriaAvg>,
    breakdown: initialBreakdown as Record<number, number>,
    reviews: initialReviews,
  });
  const [loading, setLoading] = useState(false);
  const [helpful, setHelpful] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listingReviews(listingId, { sortBy, rating: filterRating ?? undefined, limit: 20 })
      .then((res) => {
        if (cancelled) return;
        setData({
          avgRating: res.avgRating ?? 0,
          total: res.total ?? 0,
          criteriaAvg: res.criteriaAvg ?? {},
          breakdown: res.breakdown ?? {},
          reviews: res.reviews ?? res.items ?? [],
        });
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [listingId, sortBy, filterRating]);

  const totalForBars = Object.values(data.breakdown).reduce((a, b) => a + (b || 0), 0);

  async function onHelpful(id: string, current: number) {
    if (helpful[id] !== undefined) return;
    setHelpful((h) => ({ ...h, [id]: current + 1 }));
    try {
      await api.markReviewHelpful(id);
    } catch {
      setHelpful((h) => {
        const next = { ...h };
        delete next[id];
        return next;
      });
    }
  }

  async function onFlag(id: string) {
    const reason = window.prompt('Motif du signalement ?');
    if (!reason) return;
    try {
      await api.flagReview(id, reason);
      setFlagged((f) => ({ ...f, [id]: true }));
    } catch {
      /* silencieux */
    }
  }

  return (
    <section className="py-8">
      <div className="flex items-center gap-3 mb-6">
        <Star className="w-6 h-6 text-bledi-gold fill-bledi-gold" />
        <h2 className="text-2xl font-display font-bold">
          {data.avgRating} · {data.total} avis verifies
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Repartition des notes */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data.breakdown[star] || 0;
            const percentage = totalForBars > 0 ? (count / totalForBars) * 100 : 0;
            return (
              <button
                key={star}
                onClick={() => setFilterRating(filterRating === star ? null : star)}
                aria-pressed={filterRating === star}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  filterRating === star ? 'bg-bledi-blue/10' : 'hover:bg-cloud'
                }`}
              >
                <span className="text-sm font-medium w-16 text-left">{star} etoiles</span>
                <div className="flex-1 h-2 bg-cloud rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-charcoal rounded-full"
                  />
                </div>
                <span className="text-sm text-slate w-10 text-right">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Moyennes par critere */}
        <div className="grid grid-cols-2 gap-4">
          {CRITERIA.map((c) => {
            const value = data.criteriaAvg?.[c.key] ?? 0;
            return (
              <div key={c.key} className="flex flex-col">
                <span className="text-sm text-slate mb-1">{c.label}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-cloud rounded-full overflow-hidden">
                    <div
                      className="h-full bg-bledi-blue rounded-full"
                      style={{ width: `${(value || 0) * 20}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{(value || 0).toFixed(1)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              sortBy === opt.key
                ? 'bg-bledi-blue text-white'
                : 'bg-cloud text-slate hover:bg-bledi-blue/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {filterRating && (
          <button
            onClick={() => setFilterRating(null)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-cloud text-slate hover:bg-bledi-blue/10"
          >
            Retirer le filtre {filterRating} etoiles
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-slate mb-4">Chargement des avis...</p>}

      {!loading && data.reviews.length === 0 && (
        <p className="text-sm text-slate">Aucun avis pour le moment.</p>
      )}

      <AnimatePresence>
        <div className="space-y-6">
          {data.reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="border-b border-cloud pb-6 last:border-0"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-bledi-blue/10 flex items-center justify-center overflow-hidden">
                  {review.reviewer?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.reviewer.avatarUrl}
                      alt={review.reviewer.firstName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-bledi-blue" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{review.reviewer?.firstName}</div>
                  <div className="text-xs text-slate">
                    {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-1 mb-2" aria-label={`Note ${review.rating} sur 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating
                        ? 'text-bledi-gold fill-bledi-gold'
                        : 'text-cloud fill-cloud'
                    }`}
                  />
                ))}
              </div>

              <p className="text-charcoal text-sm leading-relaxed mb-3">{review.comment}</p>

              <div className="flex gap-4">
                <button
                  onClick={() => onHelpful(review.id, review.helpfulCount)}
                  disabled={helpful[review.id] !== undefined}
                  className="flex items-center gap-1 text-sm text-slate hover:text-bledi-blue transition-colors disabled:opacity-50"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Utile ({helpful[review.id] ?? review.helpfulCount})
                </button>
                <button
                  onClick={() => onFlag(review.id)}
                  disabled={flagged[review.id]}
                  className="flex items-center gap-1 text-sm text-slate hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Flag className="w-4 h-4" />
                  {flagged[review.id] ? 'Signale' : 'Signaler'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </section>
  );
}
