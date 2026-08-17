/**
 * Peut-on noter cette prestation, et dans quel sens ?
 *
 * Les regles doivent etre les MEMES que celles du serveur, sinon l interface
 * propose un bouton qui echoue ou cache une action permise. Elles sont reprises
 * ici, pas devinees : prestation acceptee, date de fin passee, et pas d avis
 * deja depose dans ce sens.
 *
 * La date fait foi, pas un clic du prestataire : c est la regle posee cote
 * serveur pour que l inaction d une partie ne bloque pas l autre.
 */
export type SensAvis = 'client_vers_prestataire' | 'prestataire_vers_client';

export function notable(prestation: any, role: 'client' | 'prestataire') {
  if (!prestation) return false;
  if (!['confirmed', 'completed'].includes(prestation.status)) return false;
  if (new Date() < new Date(prestation.endDate)) return false;

  const sens: SensAvis =
    role === 'client' ? 'client_vers_prestataire' : 'prestataire_vers_client';
  const deja = (prestation.reviews || []).some((a: any) => a.direction === sens);
  return !deja;
}

/** Ma note deja donnee sur cette prestation, s il y en a une. */
export function maNote(prestation: any, role: 'client' | 'prestataire'): number | null {
  const sens: SensAvis =
    role === 'client' ? 'client_vers_prestataire' : 'prestataire_vers_client';
  const avis = (prestation?.reviews || []).find((a: any) => a.direction === sens);
  return avis ? avis.rating : null;
}
