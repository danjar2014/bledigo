/**
 * Mode de fonctionnement de la plateforme.
 *
 * BlediGo fonctionne en PAIEMENT DIRECT : le voyageur envoie une demande, l hote
 * l accepte, les deux se joignent et reglent entre eux — en especes a l arrivee
 * pour un sejour, a la remise des cles pour un vehicule. Aucun montant ne
 * transite par la plateforme, et la monetisation est reportee SANS ECHEANCE.
 *
 * Ce n est pas un renoncement mais une strategie d amorcage : une place de
 * marche vide ne sert personne, et exiger un paiement en ligne freine
 * l inscription des hotes avant qu il n y ait des voyageurs.
 *
 * Le dispositif de paiement, validation, refus et gel des versements reste
 * ECRIT et TESTE, en sommeil derriere cet interrupteur.
 *
 * DANGER — `PAIEMENT_EN_LIGNE=true` N ALLUME PAS UN SYSTEME COMPLET. Il allume
 * un systeme qui ENCAISSE et ne REVERSE JAMAIS. Le code sait prendre
 * l argent du voyageur, le retenir et le rembourser ; il ne sait pas le verser a
 * l hote. Aucun champ IBAN n existe nulle part, aucune ligne de transfert non
 * plus : `capture()` amene les fonds sur le compte de la plateforme et s arrete
 * la. Un hote tunisien ne peut de toute facon pas etre un compte connecte
 * Stripe, la Tunisie n etant couverte ni en disponibilite, ni en beta, ni pour
 * Connect.
 *
 * Poser cette variable en production reviendrait donc a debiter des voyageurs
 * sans aucun moyen de payer les hotes. Ne pas le faire sans avoir d abord choisi
 * un rail de reversement.
 *
 * Voir docs/wayfinder/README.md pour l etat de la reflexion sur la monetisation.
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
