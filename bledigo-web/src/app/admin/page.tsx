'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Home, CalendarCheck, AlertTriangle, Wallet, BadgeCheck, Gavel, Ban, ScrollText,
} from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorBox, Empty } from '@/components/ui';
import { date, CERTIFICATIONS } from '@/lib/format';
import { useMoney } from '@/store/preferences';

const TABS = [
  ['dashboard', 'Tableau de bord'],
  ['listings', 'Moderation'],
  ['disputes', 'Litiges'],
  // Rien ne leve une mesure conservatoire automatiquement : sans cet ecran,
  // les fonds geles resteraient immobilises indefiniment.
  ['sanctions', 'Sanctions et fonds geles'],
  // Tant qu il n y a ni abonnement ni verification automatique, c est le seul
  // moyen de creer un compte prestataire : il n existe aucune inscription libre.
  ['providers', 'Prestataires'],
  ['users', 'Utilisateurs'],
  ['logs', 'Journal'],
] as const;

function Admin() {
  const [tab, setTab] = useState<string>('dashboard');

  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold text-charcoal mb-6">Back-office BlediGo</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                tab === key ? 'bg-bledi-blue text-white' : 'bg-white text-slate hover:bg-cloud'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'listings' && <ListingsTab />}
        {tab === 'disputes' && <DisputesTab />}
        {tab === 'sanctions' && <SanctionsTab />}
        {tab === 'providers' && <ProvidersTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'logs' && <LogsTab />}
      </div>
    </main>
  );
}

function DashboardTab() {
  const money = useMoney();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => api.dashboard() });
  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const cards = [
    [Users, 'Utilisateurs', data.users],
    [Home, 'Annonces', data.listings],
    [CalendarCheck, 'Reservations', data.bookings],
    [AlertTriangle, 'Litiges ouverts', data.openDisputes],
    [Wallet, 'Revenus encaisses', money(data.capturedRevenue)],
  ] as const;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map(([Icon, label, value]) => (
          <div key={label} className="bg-white rounded-bledi p-5 shadow-bledi">
            <Icon className="w-5 h-5 text-bledi-blue mb-2" />
            <div className="text-sm text-slate">{label}</div>
            <div className="font-accent font-bold text-2xl text-charcoal">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-bledi p-5 shadow-bledi">
        <h2 className="font-display font-semibold mb-3">Reservations par statut</h2>
        {!data.bookingsByStatus?.length ? (
          <p className="text-slate text-sm">Aucune reservation.</p>
        ) : (
          <div className="space-y-2">
            {data.bookingsByStatus.map((row: any) => (
              <div key={row.status} className="flex items-center gap-3">
                <span className="w-32 text-sm text-slate">{row.status}</span>
                <div className="flex-1 h-3 bg-cloud rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bledi-blue rounded-full"
                    style={{ width: `${Math.min(100, (row._count / data.bookings) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium text-charcoal">{row._count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ListingsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: () => api.listings({ limit: 100 }),
  });

  const certify = useMutation({
    mutationFn: ({ id, level }: { id: string; level: string }) => api.certify(id, level),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-listings'] }),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.moderateListing(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-listings'] }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!data.items.length) return <Empty>Aucune annonce a moderer.</Empty>;

  return (
    <div className="bg-white rounded-bledi shadow-bledi overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-cloud text-slate text-left">
          <tr>
            <th className="p-3">Annonce</th>
            <th className="p-3">Ville</th>
            <th className="p-3">Score</th>
            <th className="p-3">Certification</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((l: any) => (
            <tr key={l.id} className="border-t border-cloud">
              <td className="p-3 font-medium text-charcoal max-w-xs truncate">{l.title}</td>
              <td className="p-3 text-slate">{l.city}</td>
              <td className="p-3">{l.trustScore}/100</td>
              <td className="p-3">
                <span className={CERTIFICATIONS[l.certificationLevel]?.className}>
                  {CERTIFICATIONS[l.certificationLevel]?.label}
                </span>
              </td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">
                  {['bronze', 'silver', 'gold', 'diamond'].map((level) => (
                    <button
                      key={level}
                      onClick={() => certify.mutate({ id: l.id, level })}
                      className="text-xs px-2 py-1 rounded-full border border-cloud hover:border-bledi-blue hover:text-bledi-blue"
                    >
                      <BadgeCheck className="w-3 h-3 inline mr-1" />
                      {level}
                    </button>
                  ))}
                  <button
                    onClick={() => moderate.mutate({ id: l.id, status: 'suspended' })}
                    className="text-xs px-2 py-1 rounded-full border border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Suspendre
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DisputesTab() {
  const money = useMoney();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refunds, setRefunds] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => api.disputes({ limit: 50 }),
  });

  const decide = useMutation({
    mutationFn: ({ id, status, refundAmount }: { id: string; status: string; refundAmount?: number }) =>
      api.decideDispute(id, {
        status,
        resolutionNotes: notes[id] || 'Decision BlediGo',
        refundAmount,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-disputes'] }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!data.items.length) return <Empty>Aucun litige en cours.</Empty>;

  return (
    <div className="space-y-4">
      {data.items.map((d: any) => (
        <div key={d.id} className="bg-white rounded-bledi shadow-bledi p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-bledi-blue" />
              <span className="font-medium text-charcoal">{d.type}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cloud text-slate">{d.status}</span>
            </div>
            <span className="text-xs text-slate">{date(d.createdAt)}</span>
          </div>

          <p className="text-sm text-slate mb-3">{d.description}</p>
          {d.booking && (
            <div className="text-sm text-slate mb-3">
              Reservation du {date(d.booking.checkIn)} au {date(d.booking.checkOut)} -{' '}
              {money(Number(d.booking.totalPrice))}
            </div>
          )}

          {d.status === 'pending' || d.status === 'analysis' ? (
            <div className="border-t border-cloud pt-3 grid md:grid-cols-[1fr_160px_auto_auto] gap-2 items-end">
              <div>
                <label className="block text-xs font-medium mb-1">Notes de resolution</label>
                <input
                  className="input-bledi"
                  value={notes[d.id] || ''}
                  onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
                  placeholder="Motif de la decision"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Remboursement</label>
                <input
                  type="number"
                  className="input-bledi"
                  value={refunds[d.id] || ''}
                  onChange={(e) => setRefunds({ ...refunds, [d.id]: e.target.value })}
                  placeholder="0"
                />
              </div>
              <button
                onClick={() =>
                  decide.mutate({
                    id: d.id,
                    status: 'refunded',
                    refundAmount: Number(refunds[d.id] || d.booking?.totalPrice || 0),
                  })
                }
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-bledi-sm text-sm font-medium hover:bg-emerald-700"
              >
                Rembourser
              </button>
              <button
                onClick={() => decide.mutate({ id: d.id, status: 'rejected' })}
                className="border-2 border-red-200 text-red-700 px-4 py-2 rounded-bledi-sm text-sm font-medium hover:bg-red-50"
              >
                Rejeter
              </button>
            </div>
          ) : (
            <div className="border-t border-cloud pt-3 text-sm text-slate">
              Decision : <strong>{d.status}</strong>
              {d.refundAmount ? ` - remboursement de ${money(Number(d.refundAmount))}` : ''}
              {d.resolutionNotes ? ` - ${d.resolutionNotes}` : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Comptes prestataires.
 *
 * Phase 1 : il n existe aucune inscription libre. On cree le compte APRES avoir
 * constate le statut d agence — registre de commerce, carte professionnelle —
 * puis on transmet les identifiants a l interesse.
 *
 * Le mot de passe genere n est affiche qu ici et qu une fois : ni l envoi
 * d email ni la reinitialisation ne sont branches. D ou le bouton qui en
 * regenere un, seule voie de recuperation.
 */
function ProvidersTab() {
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState<string>('');
  /** Identifiants a montrer une fois, puis a oublier. */
  const [identifiants, setIdentifiants] = useState<{ email: string; motDePasse: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-providers', filtre],
    queryFn: () => api.adminProviders(filtre ? { type: filtre } : {}),
  });

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['admin-providers'] });

  const creer = useMutation({
    mutationFn: (dto: any) => api.adminCreateProvider(dto),
    onSuccess: (r: any) => {
      setIdentifiants(r.identifiants);
      rafraichir();
    },
  });
  const verifier = useMutation({
    mutationFn: (id: string) => api.adminVerifyProvider(id),
    onSuccess: rafraichir,
  });
  const suspendre = useMutation({
    mutationFn: (id: string) => api.adminSuspendProvider(id, 'Suspendu depuis le back-office'),
    onSuccess: rafraichir,
  });
  const regenerer = useMutation({
    mutationFn: (id: string) => api.adminResetProviderPassword(id),
    onSuccess: (r: any) => setIdentifiants(r.identifiants),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  return (
    <section>
      <FormulairePrestataire
        pending={creer.isPending}
        erreur={(creer.error as any)?.message}
        onSubmit={(dto) => creer.mutate(dto)}
      />

      {/* Affiche une seule fois : ces identifiants ne sont plus recuperables. */}
      {identifiants && (
        <div className="mt-4 p-4 rounded-bledi bg-amber-50 border-2 border-amber-300">
          <p className="font-medium text-amber-900 mb-1">
            Identifiants a transmettre maintenant
          </p>
          <p className="text-sm text-amber-900">
            Adresse : <strong>{identifiants.email}</strong>
            <br />
            Mot de passe : <strong className="font-mono">{identifiants.motDePasse}</strong>
          </p>
          <p className="text-xs text-amber-800/80 mt-2">
            Ce mot de passe n est plus consultable une fois cet encart ferme. En cas de perte, il
            faudra en regenerer un.
          </p>
          <button
            onClick={() => setIdentifiants(null)}
            className="mt-2 text-sm underline text-amber-900"
          >
            J ai transmis les identifiants
          </button>
        </div>
      )}

      {/* Une candidature spontanee arrive sans mot de passe, par construction :
          le compte existe mais la connexion lui est fermee. Verifier ne suffit
          donc pas a l ouvrir, il faut generer les identifiants. */}
      <p className="text-sm text-slate mt-4">
        Les demandes venues de la page publique arrivent « a verifier » et <strong>sans mot de
        passe</strong> : apres verification, cliquez sur « Nouveau mot de passe » pour ouvrir
        reellement le compte, puis appelez la societe.
      </p>

      <div className="flex gap-2 my-4">
        {[
          ['', 'Tous'],
          ['location_voiture', 'Location de voiture'],
          ['menage', 'Menage et entretien'],
        ].map(([v, label]) => (
          <button
            key={v || 'tous'}
            onClick={() => setFiltre(v)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              filtre === v ? 'bg-bledi-blue text-white' : 'bg-white text-slate hover:bg-cloud'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!data?.length ? (
        <Empty>Aucun prestataire enregistre.</Empty>
      ) : (
        <div className="bg-white rounded-bledi shadow-bledi overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left">
              <tr>
                <th className="p-3">Societe</th>
                <th className="p-3">Metier</th>
                <th className="p-3">Zone</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Note</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p: any) => (
                <tr key={p.id} className="border-t border-cloud">
                  <td className="p-3">
                    <div className="font-medium text-charcoal">{p.companyName}</div>
                    <div className="text-xs text-slate">{p.user?.email}</div>
                    {p.registrationNumber && (
                      <div className="text-xs text-slate">RC {p.registrationNumber}</div>
                    )}
                  </td>
                  {/* La forme juridique dit CE QU IL FAUT VERIFIER : un registre
                      de commerce pour une societe, une piece d identite pour une
                      personne physique. */}
                  <td className="p-3">
                    <div>{p.type === 'location_voiture' ? 'Location de voiture' : 'Menage'}</div>
                    <div className="text-xs text-slate">
                      {p.legalForm === 'individuel' ? 'personne physique — verifier la piece d identite' : 'societe'}
                    </div>
                  </td>
                  <td className="p-3">
                    {p.city || '—'}
                    {p.serviceRadiusKm ? ` · ${p.serviceRadiusKm} km` : ''}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-bledi-sm text-xs font-medium ${
                        p.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {p.status === 'active'
                        ? `verifie le ${date(p.verifiedAt)}`
                        : p.status === 'pending'
                          ? 'a verifier'
                          : 'suspendu'}
                    </span>
                  </td>
                  <td className="p-3">
                    {p.totalReviews ? `${p.avgRating} (${p.totalReviews})` : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {p.status !== 'active' && (
                        <button
                          onClick={() => verifier.mutate(p.id)}
                          className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-bledi-sm"
                        >
                          Verifier
                        </button>
                      )}
                      {p.status === 'active' && (
                        <button
                          onClick={() => suspendre.mutate(p.id)}
                          className="text-xs border border-red-300 text-red-700 px-2 py-1 rounded-bledi-sm"
                        >
                          Suspendre
                        </button>
                      )}
                      <button
                        onClick={() => regenerer.mutate(p.id)}
                        className="text-xs border border-cloud px-2 py-1 rounded-bledi-sm"
                      >
                        Nouveau mot de passe
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FormulairePrestataire({
  pending,
  erreur,
  onSubmit,
}: {
  pending: boolean;
  erreur?: string;
  onSubmit: (dto: any) => void;
}) {
  const [f, setF] = useState({
    companyName: '',
    type: 'location_voiture',
    legalForm: 'societe',
    email: '',
    firstName: '',
    lastName: '',
    registrationNumber: '',
    city: '',
    phone: '',
    serviceRadiusKm: '30',
  });
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }));
  const complet = f.companyName && f.email && f.firstName && f.lastName;

  return (
    <div className="bg-white rounded-bledi shadow-bledi p-4">
      <h2 className="font-display font-semibold mb-1">Creer un compte prestataire</h2>
      <p className="text-sm text-slate mb-3">
        A ne faire qu apres avoir constate le statut de l entreprise. Le compte est cree en
        attente : il faudra ensuite le verifier pour qu il devienne utilisable.
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        <input
          className="input-bledi"
          placeholder="Raison sociale"
          value={f.companyName}
          onChange={(e) => set({ companyName: e.target.value })}
        />
        <select
          className="input-bledi"
          value={f.type}
          onChange={(e) =>
            // Repasser en societe : une personne physique ne peut pas louer de
            // vehicules, et le serveur refuserait la combinaison.
            set({
              type: e.target.value,
              legalForm: e.target.value === 'menage' ? f.legalForm : 'societe',
            })
          }
        >
          <option value="location_voiture">Location de voiture</option>
          <option value="menage">Menage et entretien</option>
        </select>
        {f.type === 'menage' ? (
          <select
            className="input-bledi"
            value={f.legalForm}
            onChange={(e) => set({ legalForm: e.target.value })}
          >
            <option value="societe">Societe</option>
            <option value="individuel">Personne physique</option>
          </select>
        ) : (
          <div className="text-xs text-slate self-center">
            La location de vehicules est reservee aux societes.
          </div>
        )}
        <input
          className="input-bledi"
          placeholder="Adresse email de connexion"
          value={f.email}
          onChange={(e) => set({ email: e.target.value })}
        />
        <input
          className="input-bledi"
          placeholder="Prenom du contact"
          value={f.firstName}
          onChange={(e) => set({ firstName: e.target.value })}
        />
        <input
          className="input-bledi"
          placeholder="Nom du contact"
          value={f.lastName}
          onChange={(e) => set({ lastName: e.target.value })}
        />
        <input
          className="input-bledi"
          placeholder="Registre de commerce"
          value={f.registrationNumber}
          onChange={(e) => set({ registrationNumber: e.target.value })}
        />
        <input
          className="input-bledi"
          placeholder="Ville"
          value={f.city}
          onChange={(e) => set({ city: e.target.value })}
        />
        <input
          className="input-bledi"
          placeholder="Telephone"
          value={f.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <input
          className="input-bledi"
          type="number"
          placeholder="Rayon d intervention (km)"
          value={f.serviceRadiusKm}
          onChange={(e) => set({ serviceRadiusKm: e.target.value })}
        />
      </div>
      <button
        disabled={!complet || pending}
        onClick={() =>
          onSubmit({
            companyName: f.companyName,
            type: f.type,
            legalForm: f.legalForm,
            email: f.email,
            firstName: f.firstName,
            lastName: f.lastName,
            registrationNumber: f.registrationNumber || undefined,
            city: f.city || undefined,
            phone: f.phone || undefined,
            serviceRadiusKm: Number(f.serviceRadiusKm) || 30,
          })
        }
        className="btn-primary mt-3 disabled:opacity-50"
      >
        Creer le compte
      </button>
      {erreur && <p className="text-sm text-red-600 mt-2">{erreur}</p>}
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.users({ limit: 100 }),
  });

  const sanction = useMutation({
    mutationFn: ({ userId, type }: { userId: string; type: string }) =>
      api.sanction({ userId, type, reason: 'Sanction appliquee depuis le back-office' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div className="bg-white rounded-bledi shadow-bledi overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-cloud text-slate text-left">
          <tr>
            <th className="p-3">Utilisateur</th>
            <th className="p-3">Role</th>
            <th className="p-3">Statut</th>
            <th className="p-3">Inscrit le</th>
            <th className="p-3">Sanctions</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((u: any) => (
            <tr key={u.id} className="border-t border-cloud">
              <td className="p-3">
                <div className="font-medium text-charcoal">
                  {u.firstName} {u.lastName}
                </div>
                <div className="text-xs text-slate">{u.email}</div>
              </td>
              <td className="p-3 text-slate">{u.role}</td>
              <td className="p-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {u.status}
                </span>
              </td>
              <td className="p-3 text-slate">{date(u.createdAt)}</td>
              <td className="p-3">
                <div className="flex gap-1">
                  {['watch', 'limit', 'suspend', 'ban'].map((type) => (
                    <button
                      key={type}
                      onClick={() => sanction.mutate({ userId: u.id, type })}
                      className="text-xs px-2 py-1 rounded-full border border-cloud hover:border-red-300 hover:text-red-700"
                    >
                      <Ban className="w-3 h-3 inline mr-1" />
                      {type}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Sanctions en vigueur et versements immobilises.
 *
 * Le gel des versements est une mesure conservatoire : il protege le voyageur
 * pendant la verification, mais rien ne le leve tout seul. Sans cet ecran,
 * l argent d un hote finalement blanchi resterait bloque indefiniment — et
 * celui d un hote fautif ne serait jamais rendu au voyageur.
 */
function SanctionsTab() {
  const money = useMoney();
  const queryClient = useQueryClient();
  const [motif, setMotif] = useState<Record<string, string>>({});

  const sanctions = useQuery({ queryKey: ['admin-sanctions'], queryFn: () => api.activeSanctions() });
  const fonds = useQuery({ queryKey: ['admin-held'], queryFn: () => api.heldPayments() });

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-sanctions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-held'] });
  };

  const lever = useMutation({
    mutationFn: (id: string) => api.revokeSanction(id),
    onSuccess: rafraichir,
  });

  const denouer = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'release' | 'refund' }) =>
      api.settlePayment(id, decision, motif[id]),
    onSuccess: rafraichir,
  });

  if (sanctions.isLoading || fonds.isLoading) return <Spinner />;
  if (sanctions.error) return <ErrorBox error={sanctions.error} />;

  const listeSanctions = sanctions.data ?? [];
  const listeFonds = fonds.data ?? [];
  const totalGele = listeFonds.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">Versements geles</h2>
          {listeFonds.length > 0 && (
            <span className="text-sm text-slate">
              {listeFonds.length} paiement(s) · {money(totalGele)} immobilises
            </span>
          )}
        </div>

        {listeFonds.length === 0 ? (
          <Empty>Aucun versement en attente de decision.</Empty>
        ) : (
          <ul className="space-y-3">
            {listeFonds.map((p: any) => (
              <li key={p.id} className="bg-white rounded-bledi shadow-bledi p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium text-charcoal">
                      {p.booking?.listing?.title ?? 'Logement'}{' '}
                      <span className="text-slate font-normal">· {p.booking?.listing?.city}</span>
                    </p>
                    <p className="text-sm text-slate mt-0.5">
                      Hote {p.booking?.owner?.firstName} {p.booking?.owner?.lastName} ({p.booking?.owner?.status})
                      {' · '}Voyageur {p.booking?.traveler?.firstName} {p.booking?.traveler?.lastName}
                    </p>
                    <p className="text-xs text-slate mt-0.5">Gele le {date(p.heldAt)}</p>
                  </div>
                  <span className="font-accent font-bold text-lg text-charcoal">
                    {money(Number(p.amount))}
                  </span>
                </div>

                <input
                  className="input-bledi mb-2 text-sm"
                  placeholder="Motif de la decision (conserve dans le journal)"
                  value={motif[p.id] ?? ''}
                  onChange={(e) => setMotif({ ...motif, [p.id]: e.target.value })}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => denouer.mutate({ id: p.id, decision: 'release' })}
                    disabled={denouer.isPending}
                    className="px-4 py-2 rounded-bledi-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Verser a l hote
                  </button>
                  <button
                    onClick={() => denouer.mutate({ id: p.id, decision: 'refund' })}
                    disabled={denouer.isPending}
                    className="px-4 py-2 rounded-bledi-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    Rembourser le voyageur
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {denouer.error && <ErrorBox error={denouer.error} />}
      </section>

      <section>
        <h2 className="font-display font-semibold text-lg mb-3">Sanctions en vigueur</h2>

        {listeSanctions.length === 0 ? (
          <Empty>Aucune sanction active.</Empty>
        ) : (
          <ul className="space-y-3">
            {listeSanctions.map((s: any) => (
              <li key={s.id} className="bg-white rounded-bledi shadow-bledi p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal">
                      {s.user?.firstName} {s.user?.lastName}{' '}
                      <span className="text-slate font-normal">· {s.user?.email}</span>
                    </p>
                    <p className="text-sm text-slate mt-1">{s.reason}</p>
                    <p className="text-xs text-slate mt-1">
                      {s.type} · appliquee le {date(s.appliedAt)}
                      {s.expiresAt && ` · expire le ${date(s.expiresAt)}`}
                      {' · compte '}
                      {s.user?.status}
                    </p>
                    {/* Le gel n a plus d objet quand il ne reste personne a
                        heberger : c est le signal pour trancher. */}
                    <p className="text-xs mt-1">
                      {s.reservationsEnCours > 0 ? (
                        <span className="text-amber-700">
                          {s.reservationsEnCours} reservation(s) encore a honorer
                        </span>
                      ) : (
                        <span className="text-slate">Plus aucune reservation en cours</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => lever.mutate(s.id)}
                    disabled={lever.isPending}
                    className="px-4 py-2 rounded-bledi-sm text-sm font-medium border border-cloud text-charcoal hover:bg-cream disabled:opacity-50 shrink-0"
                  >
                    Lever la sanction
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {lever.error && <ErrorBox error={lever.error} />}
        <p className="text-xs text-slate mt-3">
          Lever la derniere sanction d un compte le remet en actif et rend ses annonces a la
          diffusion. Les versements geles, eux, se denouent un par un ci-dessus.
        </p>
      </section>
    </div>
  );
}

function LogsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.auditLogs({ limit: 50 }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!data.items.length) return <Empty>Journal vide.</Empty>;

  return (
    <div className="bg-white rounded-bledi shadow-bledi divide-y divide-cloud">
      {data.items.map((log: any) => (
        <div key={log.id} className="p-3 flex items-center gap-3 text-sm">
          <ScrollText className="w-4 h-4 text-slate shrink-0" />
          <span className="font-medium text-charcoal">{log.action}</span>
          <span className="text-slate">{log.entityType}</span>
          <span className="text-xs text-slate ml-auto">{date(log.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth roles={['admin', 'support', 'agent']}>
      <Admin />
    </RequireAuth>
  );
}
