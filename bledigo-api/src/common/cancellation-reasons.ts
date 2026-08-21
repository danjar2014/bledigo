/**
 * Motifs d annulation et de modification, liste FERMEE.
 *
 * Un champ libre seul ne se compte pas : « probleme » et « souci » designent la
 * meme chose sans jamais se regrouper. Des codes permettent de mesurer ce qui
 * casse reellement — et un hote qui voit revenir « logement non conforme » sait
 * quoi corriger, la ou trente phrases differentes ne lui apprennent rien.
 *
 * `autre` reste ouvert, avec un texte OBLIGATOIRE : une liste fermee sans
 * echappatoire pousse a cocher n importe quoi, ce qui pollue la mesure au lieu
 * de l affiner.
 */

export type MotifCategorie = 'commun' | 'sejour' | 'location';

export interface Motif {
  code: string;
  label: string;
  /** A qui ce motif est propose. `commun` vaut pour les deux. */
  portee: MotifCategorie;
  /**
   * Motif qui met en cause l autre partie. Il n emporte aucune sanction — la
   * parole d une seule partie ne prouve rien, comme pour les sinistres — mais
   * il est remonte a l administration, qui verra une recurrence.
   */
  metEnCause?: boolean;
}

export const MOTIFS: Motif[] = [
  { code: 'changement_programme', label: 'Changement de programme', portee: 'commun' },
  { code: 'urgence', label: 'Urgence familiale ou probleme de sante', portee: 'commun' },
  { code: 'transport_annule', label: 'Vol ou transport annule', portee: 'commun' },
  { code: 'erreur_reservation', label: 'Erreur dans ma reservation (dates, nombre de personnes)', portee: 'commun' },
  { code: 'plus_besoin', label: 'Je n ai plus besoin de cette reservation', portee: 'commun' },
  { code: 'logement_non_conforme', label: 'Le logement ne correspond pas a l annonce', portee: 'sejour', metEnCause: true },
  { code: 'hote_injoignable', label: 'L hote est injoignable', portee: 'sejour', metEnCause: true },
  { code: 'vehicule_indisponible', label: 'Le vehicule ne correspond pas ou n est pas disponible', portee: 'location', metEnCause: true },
  { code: 'agence_injoignable', label: 'L agence est injoignable', portee: 'location', metEnCause: true },
  { code: 'autre', label: 'Autre motif', portee: 'commun' },
];

/** Les motifs proposes pour un type de reservation donne. */
export function motifsPour(scope: 'sejour' | 'location'): Motif[] {
  return MOTIFS.filter((m) => m.portee === 'commun' || m.portee === scope);
}

export function motifValide(code: string, scope: 'sejour' | 'location'): boolean {
  return motifsPour(scope).some((m) => m.code === code);
}

export function libelleMotif(code: string): string {
  return MOTIFS.find((m) => m.code === code)?.label ?? code;
}

export function metEnCause(code: string): boolean {
  return MOTIFS.find((m) => m.code === code)?.metEnCause === true;
}
