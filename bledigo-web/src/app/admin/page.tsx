'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Home, CalendarCheck, AlertTriangle, Wallet, BadgeCheck, Gavel, Ban, ScrollText,
} from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorBox, Empty } from '@/components/ui';
import { money, date, CERTIFICATIONS } from '@/lib/format';

const TABS = [
  ['dashboard', 'Tableau de bord'],
  ['listings', 'Moderation'],
  ['disputes', 'Litiges'],
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
        {tab === 'users' && <UsersTab />}
        {tab === 'logs' && <LogsTab />}
      </div>
    </main>
  );
}

function DashboardTab() {
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
              {money(Number(d.booking.totalPrice), d.booking.currency)}
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
