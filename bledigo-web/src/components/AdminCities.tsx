'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, Eye, EyeOff, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { Empty } from './ui';

/**
 * Referentiel des villes, cote administration.
 *
 * Il vivait en dur dans le code : ajouter une destination demandait un commit
 * et un deploiement, ce qui n a pas de sens pour une donnee editoriale.
 *
 * Deux etats coexistent, et l ecran le dit franchement. Tant que rien n a ete
 * importe, on affiche la liste livree avec le code, en LECTURE : la modifier
 * n aurait aucun effet. Le bouton d import la recopie en base, apres quoi tout
 * devient modifiable.
 */
export default function AdminCities() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', region: '', latitude: '', longitude: '' });
  const [filtre, setFiltre] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'cities'],
    queryFn: () => api.adminCities(),
  });

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });

  const importer = useMutation({ mutationFn: () => api.adminImportCities(), onSuccess: rafraichir });
  const creer = useMutation({
    mutationFn: () =>
      api.adminCreateCity({
        name: form.name,
        region: form.region,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      }),
    onSuccess: () => {
      setForm({ name: '', region: '', latitude: '', longitude: '' });
      rafraichir();
    },
  });
  const basculerActive = useMutation({
    mutationFn: (v: any) => api.adminUpdateCity(v.id, { active: !v.active }),
    onSuccess: rafraichir,
  });
  const supprimer = useMutation({
    mutationFn: (id: string) => api.adminDeleteCity(id),
    onSuccess: rafraichir,
  });

  const enBase = data?.source === 'base';
  const villes = (data?.villes ?? []).filter((v: any) =>
    filtre
      ? `${v.name} ${v.region}`.toLowerCase().includes(filtre.toLowerCase())
      : true,
  );
  const complet = form.name && form.region && form.latitude && form.longitude;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-display font-semibold mb-3 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-bledi-red" />
        Villes ({data?.villes?.length ?? 0})
      </h2>

      <div className="bg-white rounded-bledi shadow-bledi p-4">
        {/* Etat « liste en dur » : le dire, et proposer la reprise. Laisser
            croire que la liste est modifiable alors qu elle ne l est pas est
            la pire des deux options. */}
        {!enBase && (
          <div className="mb-4 p-3 rounded-bledi-sm bg-amber-50 border border-amber-200 text-sm">
            <p className="font-medium text-amber-900">Liste livree avec le code, en lecture seule</p>
            <p className="text-amber-800/90 mt-1">
              Reprenez-la en base pour pouvoir ajouter, renommer ou desactiver des villes. Les
              {' '}
              {data?.villes?.length ?? 0} destinations actuelles seront conservees a l identique.
            </p>
            <button
              onClick={() => importer.mutate()}
              disabled={importer.isPending}
              className="mt-2 flex items-center gap-1.5 bg-amber-600 text-white px-3 py-2 rounded-bledi-sm text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {importer.isPending ? 'Reprise...' : 'Reprendre le referentiel'}
            </button>
          </div>
        )}

        {/* ------------------------------------------------- Ajout */}
        <div className="grid md:grid-cols-5 gap-2">
          <input
            className="input-bledi md:col-span-2"
            placeholder="Nom de la ville"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input-bledi"
            placeholder="Gouvernorat"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />
          <input
            className="input-bledi"
            type="number"
            step="0.0001"
            placeholder="Latitude"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              className="input-bledi"
              type="number"
              step="0.0001"
              placeholder="Longitude"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
            <button
              onClick={() => creer.mutate()}
              disabled={!complet || creer.isPending}
              className="btn-primary flex items-center gap-1 disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Le slug n est pas saisissable : deux orthographes casseraient le
            rapprochement avec les annonces et les zones des prestataires. */}
        <p className="text-xs text-slate mt-2">
          L identifiant technique se deduit du nom. Les coordonnees servent au calcul des distances.
        </p>

        {(creer.error || supprimer.error || importer.error) && (
          <p className="text-sm text-red-700 bg-red-50 rounded p-2 mt-3">
            {((creer.error || supprimer.error || importer.error) as Error).message}
          </p>
        )}

        {/* ------------------------------------------------- Liste */}
        <input
          className="input-bledi mt-4"
          placeholder="Filtrer par nom ou gouvernorat..."
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
        />

        <div className="mt-3 max-h-[28rem] overflow-y-auto">
          {isLoading && <p className="text-sm text-slate">Chargement...</p>}
          {!isLoading && !villes.length && <Empty>Aucune ville ne correspond.</Empty>}

          <table className="w-full text-sm">
            <tbody>
              {villes.map((v: any) => (
                <tr key={v.slug} className="border-b border-cloud last:border-0">
                  <td className="py-2 pe-2">
                    <span className={v.active ? 'text-charcoal' : 'text-slate line-through'}>
                      {v.name}
                    </span>
                    <span className="text-slate text-xs ms-2">{v.region}</span>
                  </td>
                  <td className="py-2 text-slate text-xs whitespace-nowrap">
                    {v.annonces > 0 ? `${v.annonces} annonce${v.annonces > 1 ? 's' : ''}` : '—'}
                  </td>
                  <td className="py-2 text-end whitespace-nowrap">
                    {enBase && (
                      <>
                        {/* Desactiver plutot que supprimer : c est le geste
                            attendu dans presque tous les cas, et il ne detache
                            aucune annonce. */}
                        <button
                          onClick={() => basculerActive.mutate(v)}
                          className="p-1.5 text-slate hover:text-charcoal"
                          aria-label={v.active ? 'Desactiver' : 'Reactiver'}
                          title={v.active ? 'Retirer des listes' : 'Remettre dans les listes'}
                        >
                          {v.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => supprimer.mutate(v.id)}
                          disabled={supprimer.isPending}
                          className="p-1.5 text-red-500 hover:text-red-700 disabled:opacity-40"
                          aria-label="Supprimer"
                          title={
                            v.annonces > 0
                              ? 'Des annonces y pointent : la suppression sera refusee'
                              : 'Supprimer'
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
