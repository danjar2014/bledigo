import { ScoringService } from './scoring.service';
import type { ListingFeatures } from './features.service';

/**
 * Notation d un logement.
 *
 * `calculer` est annoncee comme une fonction pure « qui se teste » depuis
 * l origine, et ne l etait pas. Ce fichier repare cet oubli au moment ou la
 * formule change — c est precisement quand une formule bouge qu on decouvre
 * qu aucun garde-fou ne disait ce qu elle devait produire.
 *
 * Ce qui est verifie ici n est pas la valeur exacte des points, qui peut
 * evoluer, mais les proprietes qui doivent survivre a toute reecriture : aucun
 * point pour un fait que rien ne produit, et un plafond qui ne triche pas.
 */
describe('ScoringService - calculer', () => {
  const service = new ScoringService({} as any, {} as any);

  const variables = (partiel: Partial<ListingFeatures> = {}): ListingFeatures => ({
    sejoursTermines: 0,
    avisRecus: 0,
    ageJours: 0,
    validationsExplicites: 0,
    validationsAutomatiques: 0,
    refusArrivee: 0,
    litigesOuverts: 0,
    litigesPerdusParHote: 0,
    criteresEchoues: {},
    noteMoyenne: 0,
    proprete: 0,
    photos: 0,
    photosCertifiees: 0,
    niveauCertification: 'none',
    tentativesHorsPlateforme: 0,
    annulationsParHote: 0,
    ...partiel,
  });

  it('annonce sa version, pour qu un score archive reste interpretable', () => {
    expect(service.calculer(variables()).modele).toBe('heuristique-v4');
  });

  /**
   * Le coeur de v4. Une photo certifiee ne rapporte plus rien parce que rien
   * dans l application ne certifie une photo : le seul point d ecriture de
   * `isCertified` est le semis de demonstration. Si un jour une certification
   * reelle existe, c est ce test qui devra etre supprime volontairement plutot
   * que la formule modifiee par distraction.
   */
  it('ne donne aucun point pour une photo certifiee, faute de quoi les certifier', () => {
    const sans = service.calculer(variables({ photosCertifiees: 0 }));
    const avec = service.calculer(variables({ photosCertifiees: 12 }));
    expect(avec.safetyScore).toBe(sans.safetyScore);
    expect(avec.trustScore).toBe(sans.trustScore);
  });

  it('ne donne pas non plus de points pour des photos brutes : trois clics ne prouvent rien', () => {
    expect(service.calculer(variables({ photos: 30 })).safetyScore).toBe(
      service.calculer(variables({ photos: 0 })).safetyScore,
    );
  });

  /**
   * La securite valait 40 + 40 + 20 + 20 = 120 en v3, ecretes a 100 : deux
   * annonces tres differentes ressortaient a egalite par troncature. En v4 le
   * maximum atteignable vaut exactement 100.
   */
  it('atteint exactement 100 en securite au maximum, sans ecretage', () => {
    const parfait = service.calculer(
      variables({ niveauCertification: 'diamond', validationsExplicites: 5 }),
    );
    expect(parfait.safetyScore).toBe(100);

    // Au-dela des seuils, rien ne deborde ni ne se perd.
    const surabondant = service.calculer(
      variables({ niveauCertification: 'diamond', validationsExplicites: 50 }),
    );
    expect(surabondant.safetyScore).toBe(100);
  });

  it('part de 40 en securite pour une annonce neuve, ni zero ni la moyenne', () => {
    expect(service.calculer(variables()).safetyScore).toBe(40);
  });

  it('efface la securite d un hote qui pousse ses clients hors plateforme', () => {
    const scores = service.calculer(
      variables({ niveauCertification: 'diamond', tentativesHorsPlateforme: 10 }),
    );
    expect(scores.safetyScore).toBe(0);
  });

  /** Lissage bayesien : une seule observation ne fait ni 0 ni 100. */
  it('ne conclut pas sur un seul sejour', () => {
    const unSeulValide = service.calculer(variables({ validationsExplicites: 1 }));
    expect(unSeulValide.complianceScore).toBeLessThan(100);
    expect(unSeulValide.complianceScore).toBeGreaterThan(50);
  });

  it('fait converger la conformite vers la realite quand les sejours s accumulent', () => {
    const peu = service.calculer(variables({ validationsExplicites: 1 }));
    const beaucoup = service.calculer(variables({ validationsExplicites: 40 }));
    expect(beaucoup.complianceScore).toBeGreaterThan(peu.complianceScore);
    expect(beaucoup.complianceScore).toBeLessThanOrEqual(100);
  });

  it('penalise un refus au-dela du simple taux', () => {
    const refuse = service.calculer(variables({ validationsExplicites: 10, refusArrivee: 1 }));
    const propre = service.calculer(variables({ validationsExplicites: 10 }));
    // Un refus sur onze sejours coute bien plus que le onzieme du taux.
    expect(propre.complianceScore - refuse.complianceScore).toBeGreaterThan(10);
  });

  it('reste borne entre 0 et 100 sur des variables absurdes', () => {
    const scores = service.calculer(
      variables({
        noteMoyenne: 5,
        proprete: 5,
        sejoursTermines: 999,
        avisRecus: 999,
        ageJours: 99999,
        validationsExplicites: 999,
        niveauCertification: 'diamond',
      }),
    );
    for (const valeur of [
      scores.trustScore,
      scores.complianceScore,
      scores.qualityScore,
      scores.cleanlinessScore,
      scores.safetyScore,
    ]) {
      expect(valeur).toBeGreaterThanOrEqual(0);
      expect(valeur).toBeLessThanOrEqual(100);
    }

    const pire = service.calculer(
      variables({ refusArrivee: 99, litigesPerdusParHote: 99, annulationsParHote: 99, tentativesHorsPlateforme: 99 }),
    );
    expect(pire.trustScore).toBeGreaterThanOrEqual(0);
    expect(pire.complianceScore).toBe(0);
  });
});
