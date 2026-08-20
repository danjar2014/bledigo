import { SearchService } from './search.service';

/**
 * Acceptation des enfants dans la recherche.
 *
 * La regle tient en une phrase, et c est justement pour cela qu elle peut se
 * degrader sans qu on le remarque : un logement qui refuse les enfants ne doit
 * disparaitre QUE des recherches qui en comportent. Filtrer en permanence le
 * retirerait aux couples et aux voyageurs seuls — soit la majorite des
 * recherches — et l hote perdrait sa clientele sans avoir rien change.
 */
describe('SearchService - acceptation des enfants', () => {
  function build() {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      listing: { findMany, count: jest.fn().mockResolvedValue(0) },
      listingCalendar: { findMany: jest.fn().mockResolvedValue([]) },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new SearchService(prisma as any, { logementsIndisponibles: jest.fn() } as any);
    return { service, findMany };
  }

  /** Le `where` reellement envoye a Prisma, seul juge de ce qui est filtre. */
  const critere = (findMany: jest.Mock) => findMany.mock.calls[0][0].where;

  it('n impose rien quand la recherche ne porte sur aucun enfant', async () => {
    const { service, findMany } = build();

    await service.search({ guests: 2 } as any);

    expect(critere(findMany).childrenAllowed).toBeUndefined();
  });

  it('n impose rien non plus quand le champ vaut zero', async () => {
    const { service, findMany } = build();

    await service.search({ guests: 2, enfants: 0 } as any);

    expect(critere(findMany).childrenAllowed).toBeUndefined();
  });

  it('ecarte les logements qui refusent les enfants des qu il y en a un', async () => {
    const { service, findMany } = build();

    await service.search({ guests: 3, enfants: 1 } as any);

    expect(critere(findMany).childrenAllowed).toBe(true);
  });

  /** Les parametres d URL arrivent en CHAINES : un test qui ne passe que des
   *  nombres laisserait passer une comparaison qui echoue en production. */
  it('traite « 2 » venu de l URL comme un nombre', async () => {
    const { service, findMany } = build();

    await service.search({ guests: '4', enfants: '2' } as any);

    expect(critere(findMany).childrenAllowed).toBe(true);
  });

  it('laisse la capacite faire son travail separement', async () => {
    const { service, findMany } = build();

    await service.search({ guests: 5, enfants: 3 } as any);

    // Le total gouverne la capacite, les enfants ne la remplacent pas.
    expect(critere(findMany).maxGuests).toEqual({ gte: 5 });
    expect(critere(findMany).childrenAllowed).toBe(true);
  });
});
