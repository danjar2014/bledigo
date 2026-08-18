import { ServiceReviewsService } from './reviews.service';

/**
 * Score de confiance d un prestataire.
 *
 * La regle qui compte n est pas la formule mais ce qu elle refuse : qu un avis
 * unique et complaisant vaille une reputation. Sans ponderation par le volume,
 * un faux prestataire s en achete une pour le prix d un seul avis.
 */
describe('ServiceReviewsService - score', () => {
  const service = new ServiceReviewsService({} as any);
  // La formule est privee : on la sollicite comme le fait recalculer().
  const score = (moyenne: number, nombre: number, jobs: number) =>
    (service as any).score(moyenne, nombre, jobs);

  it('ne donne aucun score a un prestataire sans avis', () => {
    expect(score(0, 0, 0)).toBe(0);
  });

  it('refuse qu un 5/5 unique batte un 4,6 sur trente', () => {
    const debutant = score(5, 1, 1);
    const etabli = score(4.6, 30, 30);
    expect(etabli).toBeGreaterThan(debutant);
  });

  it('n ecrase pas un nouveau prestataire sur un premier avis moyen', () => {
    // 3/5 sur un seul avis reste proche du plancher, pas au fond.
    expect(score(3, 1, 1)).toBeGreaterThan(40);
  });

  it('fait converger la note vers sa valeur reelle quand le volume monte', () => {
    const peu = score(4.8, 2, 2);
    const beaucoup = score(4.8, 50, 50);
    expect(beaucoup).toBeGreaterThan(peu);
    expect(beaucoup).toBeLessThanOrEqual(100);
  });

  it('ne laisse pas l activite compenser une mauvaise note', () => {
    // 100 prestations menees a terme mais 1,5/5 : le plafond d activite ne
    // permet pas de repasser devant un prestataire correct.
    expect(score(1.5, 40, 100)).toBeLessThan(score(4.5, 40, 0));
  });

  it('reste borne entre 0 et 100', () => {
    expect(score(5, 999, 999)).toBeLessThanOrEqual(100);
    expect(score(1, 999, 0)).toBeGreaterThanOrEqual(0);
  });
});
