import { BookingsService } from './bookings.service';

/**
 * Extension d un sejour en cours.
 *
 * Ce qui se teste ici n est pas l arithmetique des nuits, mais les trois refus
 * qui font la difference entre une prolongation et une vente de dates deja
 * vendues : l hote garde la main, la disponibilite est reverifiee au moment
 * d accorder, et le prix reste celui que le voyageur a vu.
 */
describe('BookingsService - extension de sejour', () => {
  const RESERVATION = {
    id: 'b-1',
    listingId: 'l-1',
    travelerId: 'voyageur',
    ownerId: 'hote',
    checkIn: new Date('2026-11-10'),
    checkOut: new Date('2026-11-13'),
    status: 'confirmed',
    totalNights: 3,
    basePrice: 540,
    cleaningFee: 40,
    serviceFee: 18,
    totalPrice: 598,
    currency: 'TND',
    extensionCheckOut: null as Date | null,
    extensionPrice: null as number | null,
    listing: { instantBook: false },
  };

  function build(surcharge: any = {}) {
    const reservation = { ...RESERVATION, ...surcharge, listing: { ...RESERVATION.listing, ...(surcharge.listing ?? {}) } };
    const update = jest.fn().mockImplementation(({ data }) => ({ ...reservation, ...data }));
    const prisma = {
      booking: {
        findFirst: jest
          .fn()
          // Le premier appel retrouve la reservation ; les suivants cherchent un
          // chevauchement, absent par defaut.
          .mockResolvedValueOnce(reservation)
          .mockResolvedValue(surcharge.chevauchement ?? null),
        update,
      },
      listingCalendar: { findFirst: jest.fn().mockResolvedValue(surcharge.datesFermees ?? null) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    // Deux nuits de plus a 200 : le tarif de la periode etendue n est pas celui
    // du sejour initial (180/nuit), c est tout l interet du recalcul.
    const calendar = {
      tarifer: jest.fn().mockResolvedValue({ nuits: 2, basePrice: 400, minNights: 7, prixMoyen: 200 }),
    };
    const service = new BookingsService(
      prisma as any,
      {} as any,
      {} as any,
      calendar as any,
      {} as any,
      {} as any,
    );
    return { service, prisma, update, calendar };
  }

  const PLUS_DEUX_NUITS = new Date('2026-11-15');

  describe('devis', () => {
    it('retarife les nuits ajoutees plutot que d appliquer le tarif du sejour', async () => {
      const { service, calendar } = build();

      const devis = await service.devisExtension('voyageur', 'b-1', PLUS_DEUX_NUITS);

      // Tarifees sur la periode ETENDUE seulement, du depart prevu au nouveau.
      expect(calendar.tarifer).toHaveBeenCalledWith('l-1', new Date('2026-11-13'), PLUS_DEUX_NUITS);
      expect(devis.nuitsAjoutees).toBe(2);
      expect(devis.prix).toBe(400);
    });

    it('ne refacture ni le menage ni les frais de service', async () => {
      const { service } = build();

      const devis = await service.devisExtension('voyageur', 'b-1', PLUS_DEUX_NUITS);

      // 598 + 400, et non 598 + 400 + 40 + 18 : le logement n est pas nettoye
      // une seconde fois parce que son occupant reste.
      expect(devis.totalApresExtension).toBe(998);
    });

    it('n oppose pas le sejour minimum de la periode a quelqu un deja sur place', async () => {
      // tarifer annonce minNights: 7 sur la periode etendue. Exiger sept nuits
      // de PLUS d un voyageur qui en a deja passe trois n a aucun sens.
      const { service } = build();

      await expect(service.devisExtension('voyageur', 'b-1', PLUS_DEUX_NUITS)).resolves.toMatchObject({
        nuitsAjoutees: 2,
      });
    });

    it('refuse de prolonger un sejour que personne n a accepte', async () => {
      const { service } = build({ status: 'pending' });

      await expect(service.devisExtension('voyageur', 'b-1', PLUS_DEUX_NUITS)).rejects.toThrow(
        /accepte et non termine/,
      );
    });

    it('refuse de prolonger un sejour termine', async () => {
      const { service } = build({ status: 'completed' });

      await expect(service.devisExtension('voyageur', 'b-1', PLUS_DEUX_NUITS)).rejects.toThrow(
        /accepte et non termine/,
      );
    });

    it('refuse une date de depart qui n allonge rien', async () => {
      const { service } = build();

      await expect(
        service.devisExtension('voyageur', 'b-1', new Date('2026-11-12')),
      ).rejects.toThrow(/posterieure/);
    });

    it('refuse des nuits deja reservees par quelqu un d autre', async () => {
      const { service } = build({ chevauchement: { id: 'b-2' } });

      await expect(service.devisExtension('voyageur', 'b-1', PLUS_DEUX_NUITS)).rejects.toThrow(
        /deja reservees/,
      );
    });

    it('refuse des dates que l hote a fermees', async () => {
      const { service } = build({ datesFermees: { id: 'c-1' } });

      await expect(service.devisExtension('voyageur', 'b-1', PLUS_DEUX_NUITS)).rejects.toThrow(
        /ferme ces dates/,
      );
    });
  });

  describe('demande', () => {
    it('attend l accord de l hote quand la reservation instantanee est decochee', async () => {
      const { service, update } = build();

      const res = await service.demanderExtension('voyageur', 'b-1', PLUS_DEUX_NUITS);

      expect(res.applique).toBe(false);
      // Rien du sejour n a bouge : seule la demande est enregistree.
      const ecrit = update.mock.calls[0][0].data;
      expect(ecrit).toMatchObject({ extensionCheckOut: PLUS_DEUX_NUITS, extensionPrice: 400 });
      expect(ecrit.checkOut).toBeUndefined();
      expect(ecrit.totalPrice).toBeUndefined();
    });

    it('applique d emblee quand l hote a coche la reservation instantanee', async () => {
      const { service, update } = build({ listing: { instantBook: true } });

      const res = await service.demanderExtension('voyageur', 'b-1', PLUS_DEUX_NUITS);

      expect(res.applique).toBe(true);
      expect(update.mock.calls[0][0].data).toMatchObject({
        checkOut: PLUS_DEUX_NUITS,
        totalNights: 5,
        totalPrice: 998,
      });
    });

    it('ajoute au sejour initial au lieu de le retarifer entierement', async () => {
      const { service, update } = build({ listing: { instantBook: true } });

      await service.demanderExtension('voyageur', 'b-1', PLUS_DEUX_NUITS);

      // 540 + 400 : le sejour initial garde le tarif auquel il a ete accepte,
      // qu une periode saisonniere apparue depuis ne doit pas modifier.
      expect(update.mock.calls[0][0].data.basePrice).toBe(940);
    });
  });

  describe('acceptation', () => {
    function enAttente(surcharge: any = {}) {
      return build({
        extensionCheckOut: PLUS_DEUX_NUITS,
        extensionPrice: 400,
        ...surcharge,
      });
    }

    it('prolonge le sejour et efface la demande', async () => {
      const { service, update } = enAttente();

      await service.accepterExtension('hote', 'b-1');

      expect(update.mock.calls[0][0].data).toMatchObject({
        checkOut: PLUS_DEUX_NUITS,
        totalNights: 5,
        totalPrice: 998,
        extensionCheckOut: null,
        extensionPrice: null,
      });
    });

    /**
     * Le test qui justifie tout le reste. Entre la demande et la reponse de
     * l hote, quelqu un d autre a reserve ces nuits. Accepter sur la foi du
     * devis vendrait deux fois les memes dates.
     */
    it('refuse si les nuits ont ete prises entre la demande et la reponse', async () => {
      const { service, update } = enAttente({ chevauchement: { id: 'b-2' } });

      await expect(service.accepterExtension('hote', 'b-1')).rejects.toThrow(/deja reservees/);
      expect(update).not.toHaveBeenCalled();
    });

    it('honore le prix annonce au voyageur, meme si les tarifs ont change depuis', async () => {
      // tarifer renvoie 400, mais la demande avait ete figee a 250 : c est ce
      // montant-la que le voyageur a accepte.
      const { service, update } = enAttente({ extensionPrice: 250 });

      await service.accepterExtension('hote', 'b-1');

      expect(update.mock.calls[0][0].data.totalPrice).toBe(848);
    });

    it('refuse d accepter une extension qui n a pas ete demandee', async () => {
      const { service } = build();

      await expect(service.accepterExtension('hote', 'b-1')).rejects.toThrow(/Aucune extension/);
    });
  });

  describe('refus', () => {
    it('efface la demande sans toucher au sejour', async () => {
      const { service, update } = build({ extensionCheckOut: PLUS_DEUX_NUITS, extensionPrice: 400 });

      await service.refuserExtension('hote', 'b-1');

      const ecrit = update.mock.calls[0][0].data;
      expect(ecrit).toEqual({
        extensionCheckOut: null,
        extensionPrice: null,
        extensionRequestedAt: null,
      });
    });
  });
});
