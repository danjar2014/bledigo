'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';

/**
 * Envoi de photos, partage entre les vehicules et les logements.
 *
 * Un seul composant deliberement : le formulaire d annonce empilait jusqu ici
 * des URL picsum, et dupliquer ce raccourci pour les voitures aurait cree une
 * seconde fausse galerie a reparer plus tard.
 *
 * Le fichier ne passe PAS par l API : `api.uploadFile` demande une URL signee
 * puis televerse directement vers le stockage. Faire transiter des photos par
 * une instance gratuite serait la meilleure facon de la faire tomber.
 */
export default function PhotoUploader({
  photos,
  onAdd,
  onRemove,
  dossier,
  max = 10,
  aide,
}: {
  photos: { id?: string; url: string; isPrimary?: boolean }[];
  onAdd: (file: File) => Promise<void>;
  onRemove: (photo: { id?: string; url: string }) => void;
  dossier: string;
  max?: number;
  aide?: string;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);

  const choisir = async (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    setErreur(null);

    // Plusieurs fichiers d un coup : c est le cas normal quand on photographie
    // une voiture sous six angles.
    const restants = max - photos.length;
    const aEnvoyer = Array.from(fichiers).slice(0, restants);
    if (aEnvoyer.length < fichiers.length) {
      setErreur(`${max} photos au maximum : les suivantes ont ete ignorees.`);
    }

    for (const f of aEnvoyer) {
      setEnvoiEnCours((n) => n + 1);
      try {
        await onAdd(f);
      } catch (e: any) {
        setErreur(e.message || "L envoi a echoue");
      } finally {
        setEnvoiEnCours((n) => n - 1);
      }
    }
    if (champ.current) champ.current.value = '';
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center">
        {photos.map((p, i) => (
          <div key={p.id ?? p.url} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="w-32 h-24 object-cover rounded-bledi-sm bg-cloud" />
            {(p.isPrimary ?? i === 0) && (
              <span className="absolute top-1 left-1 bg-bledi-blue text-white text-[10px] px-1.5 py-0.5 rounded">
                Principale
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(p)}
              className="absolute top-1 right-1 bg-white/90 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Retirer la photo"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            onClick={() => champ.current?.click()}
            disabled={envoiEnCours > 0}
            className="flex items-center gap-2 border-2 border-dashed border-cloud text-slate px-4 py-6 rounded-bledi-sm hover:border-bledi-blue hover:text-bledi-blue disabled:opacity-50"
          >
            {envoiEnCours > 0 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4" />
                Ajouter des photos
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={champ}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        data-dossier={dossier}
        onChange={(e) => choisir(e.target.files)}
      />

      {erreur && <p className="text-xs text-red-700 mt-2">{erreur}</p>}
      {aide && !erreur && <p className="text-xs text-slate mt-2">{aide}</p>}
    </div>
  );
}
