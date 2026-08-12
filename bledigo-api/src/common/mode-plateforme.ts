/**
 * Mode de fonctionnement de la plateforme.
 *
 * BlediGo demarre en PAIEMENT DIRECT : le voyageur envoie une demande, l hote
 * l accepte, les deux se joignent et reglent entre eux. Aucun montant ne
 * transite par la plateforme.
 *
 * Ce n est pas un renoncement mais une strategie d amorcage : une place de
 * marche vide ne sert personne, et exiger un paiement en ligne freine
 * l inscription des hotes avant qu il n y ait des voyageurs.
 *
 * IMPORTANT — tout le dispositif de paiement, validation, refus et gel des
 * versements reste ECRIT et TESTE. Il est seulement mis en sommeil par cet
 * interrupteur. Le supprimer aurait rendu la phase 2 aussi couteuse qu une
 * reconstruction.
 *
 * Pour rallumer le paiement : PAIEMENT_EN_LIGNE=true dans l environnement.
 */
export function paiementEnLigne(): boolean {
  return String(process.env.PAIEMENT_EN_LIGNE ?? '').toLowerCase() === 'true';
}

/**
 * Le filtre anti-fraude sur les coordonnees n a de sens que si la plateforme
 * tient l argent. En paiement direct, les deux parties DOIVENT pouvoir se
 * joindre — mais seulement une fois la demande acceptee, pour que le filtre
 * continue de proteger du demarchage et de l aspiration de contacts.
 */
export function coordonneesAutorisees(demandeAcceptee: boolean): boolean {
  return !paiementEnLigne() && demandeAcceptee;
}

/** Les credits sont offerts tant qu il n y a pas de moyen d encaisser. */
export function creditsGratuits(): boolean {
  return !paiementEnLigne();
}
