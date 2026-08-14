import { NoShowGuardService } from './no-show-guard.service';

/**
 * Le double signal.
 *
 * Sans paiement, la seule sanction possible porte sur le compte du voyageur.
 * Elle ne peut donc pas reposer sur la parole d une seule partie — ni sur
 * l absence de check-in, que l hote seul declenche.
 */
describe('NoShowGuardService', () => {
  function build(booking: any, compteurs: { absencesVoyageur: number; declarationsHote: number; sejoursHote: number }) {
    const applySanction = jest.fn();
    let appel = 0;
    const prisma = {
      booking: {
        findUnique: jest.fn().mockResolvedValue(booking),
        // L ordre des count suit celui du Promise.all du service.
        count: jest.fn().mockImplementation(() => {
          const valeurs = [compteurs.absencesVoyageur, compteurs.declarationsHote, compteurs.sejoursHote];
          return Promise.resolve(valeurs[appel++] ?? 0);
        }),
      },
      auditLog: { create: jest.fn() },
    };
    return {
      service: new NoShowGuardService(prisma as any, { applySanction } as any),
      applySanction,
      prisma,
    };
  }

  const base = {
    id: 'b-1',
    travelerId: 'voyageur',
    ownerId: 'hote',
    arrivalConfirmedAt: null,
    noShowDeclaredBy: 'hote',
  };

  it('n etablit rien et ne sanctionne personne si le voyageur a declare son arrivee', async () => {
    const { service, applySanction } = build(
      { ...base, arrivalConfirmedAt: new Date() },
      { absencesVoyageur: 5, declarationsHote: 1, sejoursHote: 10 },
    );

    const v = await service.evaluer('b-1');

    expect(v.contradiction).toBe(true);
    expect(v.etabli).toBe(false);
    expect(applySanction).not.toHaveBeenCalled();
  });

  it('etablit l absence sans sanctionner au premier incident', async () => {
    const { service, applySanction } = build(base, {
      absencesVoyageur: 1,
      declarationsHote: 1,
      sejoursHote: 10,
    });

    const v = await service.evaluer('b-1');

    expect(v.etabli).toBe(true);
    expect(applySanction).not.toHaveBeenCalled();
  });

  it('suspend le voyageur a la recidive', async () => {
    const { service, applySanction } = build(base, {
      absencesVoyageur: 2,
      declarationsHote: 2,
      sejoursHote: 20,
    });

    const v = await service.evaluer('b-1');

    expect(v.sanctions.some((s) => s.userId === 'voyageur')).toBe(true);
    expect(applySanction).toHaveBeenCalled();
  });

  it('surveille l hote qui declare trop d absences pour son volume', async () => {
    // Deux declarations pour trois sejours aboutis : le taux, pas le nombre.
    const { service } = build(base, { absencesVoyageur: 1, declarationsHote: 2, sejoursHote: 3 });

    const v = await service.evaluer('b-1');

    expect(v.sanctions.some((s) => s.userId === 'hote')).toBe(true);
    expect(v.tauxDeclarationsHote).toBeCloseTo(2 / 3);
  });

  it('laisse un delai au voyageur avant toute declaration possible', () => {
    const arrivee = new Date('2026-09-10T15:00:00Z');
    const fin = NoShowGuardService.finDuDelaiDeGrace(arrivee);

    expect(fin.getTime() - arrivee.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
