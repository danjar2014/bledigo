'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  MapPin,
  CalendarDays,
  Users,
  Bed,
  Bath,
  Wallet,
  Shield,
  Send,
  Inbox,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { usePreferences } from '@/store/preferences';
import { date, nights } from '@/lib/format';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorBox } from '@/components/ui';

/** Doit rester aligne avec MAX_TEMPLATES_PER_OFFER cote API. */
const MAX_TEMPLATES = 5;

/** Formulaire d offre : le proprietaire propose un de ses logements. */
function OfferForm({ searchId, search }: { searchId: string; search: any }) {
  const { money } = usePreferences();
  const router = useRouter();
  const [listingId, setListingId] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [messageKeys, setMessageKeys] = useState<string[]>([]);

  const { data: listings, isLoading } = useQuery({
    queryKey: ['my-listings-offer'],
    queryFn: () => api.myListings(),
  });

  const { data: templates } = useQuery({
    queryKey: ['offer-templates'],
    queryFn: () => api.offerTemplates(),
    staleTime: Infinity,
  });

  const selected = (listings ?? []).find((l: any) => l.id === listingId);
  const nbNights = search ? nights(search.checkIn, search.checkOut) : 0;

  const offer = useMutation({
    mutationFn: () =>
      api.makeOffer(searchId, {
        listingId,
        proposedPrice: Number(proposedPrice),
        messageKeys,
      }),
    onSuccess: () => router.push('/besoins'),
  });

  if (isLoading) return <Spinner label="Chargement de vos logements..." />;

  // Seuls les logements compatibles sont proposables : l API refuserait les autres
  const eligible = (listings ?? []).filter((l: any) => l.maxGuests >= (search?.guestsCount ?? 1));

  if (eligible.length === 0) {
    return (
      <div className="bg-white rounded-bledi shadow-bledi p-6 text-center">
        <p className="text-slate mb-4">
          Aucun de vos logements ne peut accueillir {search?.guestsCount} voyageurs.
        </p>
        <Link href="/proprietaire/annonces/nouvelle" className="btn-primary inline-block">
          Publier une annonce
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-bledi shadow-bledi p-6 space-y-4">
      <h2 className="font-display font-semibold text-lg">Proposer un logement</h2>

      <div>
        <label htmlFor="listing" className="block text-sm font-medium mb-1">
          Votre logement
        </label>
        <select
          id="listing"
          value={listingId}
          onChange={(e) => {
            setListingId(e.target.value);
            const l = eligible.find((x: any) => x.id === e.target.value);
            if (l && !proposedPrice) setProposedPrice(String(l.pricePerNight));
          }}
          className="input-bledi"
        >
          <option value="">Choisir un logement</option>
          {eligible.map((l: any) => (
            <option key={l.id} value={l.id}>
              {l.title} — {l.city} ({l.maxGuests} voyageurs)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium mb-1">
          Prix propose par nuit (TND)
        </label>
        <input
          id="price"
          type="number"
          min={0}
          value={proposedPrice}
          onChange={(e) => setProposedPrice(e.target.value)}
          className="input-bledi"
        />
        {selected && (
          <p className="text-xs text-slate mt-1">
            Tarif habituel : {money(Number(selected.pricePerNight))}
            {search?.budgetMax != null && (
              <> · budget du voyageur : max {money(Number(search.budgetMax))}</>
            )}
            {nbNights > 0 && proposedPrice && (
              <> · total {nbNights} nuits : {money(Number(proposedPrice) * nbNights)}</>
            )}
          </p>
        )}
      </div>

      <div>
        <span className="block text-sm font-medium mb-1">
          Message au voyageur{' '}
          <span className="text-slate font-normal">
            ({messageKeys.length}/{MAX_TEMPLATES})
          </span>
        </span>
        <p className="text-xs text-slate mb-2">
          Composez votre message a partir des propositions. La saisie libre est desactivee a ce
          stade : elle protege les deux parties du demarchage. Vos coordonnees seront echangees
          automatiquement des que le voyageur retiendra votre offre.
        </p>

        <div className="border border-cloud rounded-bledi-sm max-h-64 overflow-y-auto">
          {(templates ?? []).map((group: any) => (
            <fieldset key={group.group}>
              <legend className="w-full px-3 py-1.5 text-xs font-semibold text-slate bg-cream">
                {group.group}
              </legend>
              {group.items.map((tpl: any) => {
                const active = messageKeys.includes(tpl.key);
                const full = messageKeys.length >= MAX_TEMPLATES && !active;
                return (
                  <label
                    key={tpl.key}
                    className={`flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-cloud ${
                      full ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={full}
                      onChange={() =>
                        setMessageKeys((keys) =>
                          active ? keys.filter((k) => k !== tpl.key) : [...keys, tpl.key],
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className={active ? 'text-charcoal' : 'text-slate'}>{tpl.text}</span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>

        {messageKeys.length > 0 && (
          <div className="mt-2 p-3 bg-cream rounded-bledi-sm text-sm text-charcoal">
            <span className="text-xs text-slate block mb-1">Apercu du message envoye</span>
            {(templates ?? [])
              .flatMap((g: any) => g.items)
              .filter((t: any) => messageKeys.includes(t.key))
              .map((t: any) => t.text)
              .join(' ')}
          </div>
        )}
      </div>

      {offer.error && <ErrorBox error={offer.error} />}

      <div className="flex items-center gap-3 pt-2 border-t border-cloud">
        <button
          onClick={() => offer.mutate()}
          disabled={!listingId || !proposedPrice || messageKeys.length === 0 || offer.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {offer.isPending ? 'Envoi...' : 'Envoyer mon offre'}
        </button>
        <Link href="/besoins" className="btn-secondary">
          Retour
        </Link>
      </div>

      <p className="text-xs text-slate">
        Votre offre reste valable 48 heures. Le voyageur la compare aux autres avant de choisir.
      </p>
    </div>
  );
}

function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { money } = usePreferences();

  const { data: search, isLoading, error } = useQuery({
    queryKey: ['reverse-search', id],
    queryFn: () => api.reverseSearch(id),
  });

  if (isLoading) return <Spinner />;
  if (error)
    return (
      <main className="container mx-auto px-4 py-10">
        <ErrorBox error={error} />
        <Link href="/besoins" className="btn-secondary inline-block mt-4">
          Retour aux demandes
        </Link>
      </main>
    );

  const isAuthor = search?.travelerId === user?.id;
  const nbNights = search ? nights(search.checkIn, search.checkOut) : 0;

  return (
    <main className="min-h-screen bg-cream">
      <div className="bg-bledi-blue text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-display font-bold mb-2">{search.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-bledi-red" />
              {search.city || search.destination}
              {search.region ? ` · ${search.region}` : ''}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              {date(search.checkIn)} - {date(search.checkOut)} ({nbNights} nuits)
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {search.guestsCount} voyageurs
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[1fr_420px] gap-8">
        <div className="space-y-6">
          <section className="bg-white rounded-bledi shadow-bledi p-6">
            <h2 className="font-display font-semibold text-lg mb-2">Le besoin</h2>
            <p className="text-slate whitespace-pre-line">{search.description}</p>

            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-cloud text-sm text-charcoal">
              {search.bedrooms != null && (
                <span className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-slate" />
                  {search.bedrooms} chambres
                </span>
              )}
              {search.bathrooms != null && (
                <span className="flex items-center gap-2">
                  <Bath className="w-4 h-4 text-slate" />
                  {search.bathrooms} salles de bain
                </span>
              )}
              {search.budgetMax != null && (
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-slate" />
                  Budget max {money(Number(search.budgetMax))} / nuit
                </span>
              )}
            </div>
          </section>

          {search.traveler && (
            <section className="bg-white rounded-bledi shadow-bledi p-6">
              <h2 className="font-display font-semibold text-lg mb-3">Le voyageur</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-bledi-blue text-white flex items-center justify-center font-bold">
                  {search.traveler.firstName?.[0]}
                </div>
                <div>
                  <div className="font-medium text-charcoal">{search.traveler.firstName}</div>
                  <div className="text-xs text-slate flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-bledi-blue" />
                    Score de confiance{' '}
                    {search.traveler.travelerPassport?.trustScore ?? '-'} ·{' '}
                    {search.traveler.travelerPassport?.totalStays ?? 0} sejours
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside>
          {isAuthor ? (
            <div className="bg-white rounded-bledi shadow-bledi p-6 text-center">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-slate mb-4">
                C est votre demande. Consultez les offres que les proprietaires vous ont envoyees.
              </p>
              <Link
                href={`/besoins/${id}/offres`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Inbox className="w-4 h-4" />
                Voir les offres recues
              </Link>
            </div>
          ) : (
            <OfferForm searchId={id} search={search} />
          )}
        </aside>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <RequestDetail />
    </RequireAuth>
  );
}
