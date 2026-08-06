'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Star } from 'lucide-react';
import { api } from '@/lib/api';

export default function ReviewModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const create = useMutation({
    mutationFn: () => api.createReview({ bookingId: booking.id, rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-bledi w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-charcoal">Deposer un avis</h2>
          <button onClick={onClose} className="p-1 text-slate hover:text-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} type="button">
              <Star
                className={`w-8 h-8 ${n <= rating ? 'text-bledi-gold fill-bledi-gold' : 'text-cloud'}`}
              />
            </button>
          ))}
        </div>

        <textarea
          className="input-bledi h-28 mb-4"
          placeholder="Votre experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {create.error && (
          <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-3">
            {(create.error as Error).message}
          </div>
        )}

        <button
          onClick={() => create.mutate()}
          disabled={!comment || create.isPending}
          className="btn-primary w-full disabled:opacity-50"
        >
          {create.isPending ? 'Envoi...' : 'Publier mon avis'}
        </button>
      </div>
    </div>
  );
}
