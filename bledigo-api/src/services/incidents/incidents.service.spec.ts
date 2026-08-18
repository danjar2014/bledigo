import { IncidentsService } from './incidents.service';

/**
 * Sinistres au retour d un vehicule.
 *
 * Le point a tenir n est pas l enregistrement, qui est trivial, mais ce que le
 * sinistre NE declenche pas. Une agence qui declare un dommage recupere une
 * caution : c est exactement le genre d interet qui interdit de la croire sur
 * parole, et le projet a deja tranche ce point pour les absences a l arrivee.
 */
describe('IncidentsService', () => {
  const JOUR = 24 * 60 * 60 * 1000;
  const hier = new Date(Date.now() - JOUR);
  const demain = new Date(Date.now() + JOUR);

  function build(surcharge: any = {}) {
    const location = {
      id: 'loc-1',
      type: 'location_voiture',
      status: 'completed',
      providerId: 'p-1',
      requesterId: 'client',
      vehicleId: 'v-1',
      endDate: hier,
      ...surcharge.location,
    };
    const sinistre = {
      id: 'sin-1',
      serviceBookingId: 'loc-1',
      declaredBy: 'agence',
      declaredAt: hier,
      contestedAt: null,
      resolution: 'etabli',
      ...surcharge.sinistre,
    };

    const create = jest.fn().mockImplementation(({ data }) => ({ id: 'sin-1', ...data }));
    const update = jest.fn().mockImplementation(({ data }) => ({ ...sinistre, ...data }));
    const prisma = {
      serviceProvider: {
        findUnique: jest.fn().mockResolvedValue(surcharge.provider ?? { id: 'p-1', userId: 'agence' }),
      },
      serviceBooking: { findFirst: jest.fn().mockResolvedValue(surcharge.location === null ? null : location) },
      vehicleIncident: {
        create,
        update,
        findUnique: jest.fn().mockResolvedValue(sinistre),
        findFirst: jest.fn().mockResolvedValue(surcharge.sinistre === null ? null : sinistre),
        findMany: jest.fn().mockResolvedValue([sinistre]),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    return { service: new IncidentsService(prisma as any), prisma, create, update };
  }

  const DECLARATION = {
    type: 'rayure',
    description: 'Rayure profonde sur la portiere avant droite, absente au depart',
  };

  describe('declaration', () => {
    it('enregistre un sinistre sur une location restituee', async () => {
      const { service, create } = build();

      await service.declarer('agence', 'loc-1', DECLARATION as any);

      expect(create.mock.calls[0][0].data).toMatchObject({
        serviceBookingId: 'loc-1',
        declaredBy: 'agence',
        type: 'rayure',
      });
    });

    it('refuse avant la restitution : le vehicule est encore chez le client', async () => {
      const { service } = build({ location: { endDate: demain } });

      await expect(service.declarer('agence', 'loc-1', DECLARATION as any)).rejects.toThrow(
        /une fois le vehicule restitue/,
      );
    });

    /**
     * Passe une semaine, le vehicule a pu etre reloue : plus rien ne rattache
     * le dommage a CE client. Une declaration tardive n est pas une preuve.
     */
    it('refuse au-dela de la fenetre de sept jours', async () => {
      const { service } = build({ location: { endDate: new Date(Date.now() - 8 * JOUR) } });

      await expect(service.declarer('agence', 'loc-1', DECLARATION as any)).rejects.toThrow(
        /Delai depasse/,
      );
    });

    it('refuse sur une location annulee : le vehicule n est jamais parti', async () => {
      const { service } = build({ location: { status: 'cancelled' } });

      await expect(service.declarer('agence', 'loc-1', DECLARATION as any)).rejects.toThrow(
        /refusee ou annulee/,
      );
    });

    it('refuse sur une prestation de menage', async () => {
      const { service } = build({ location: { type: 'menage' } });

      await expect(service.declarer('agence', 'loc-1', DECLARATION as any)).rejects.toThrow(
        /location de vehicule/,
      );
    });
  });

  describe('contestation', () => {
    /**
     * Le coeur du dispositif. Contester n efface pas la declaration, elle
     * l oppose — et surtout, rien dans le resultat ne sanctionne personne.
     */
    it('oppose les deux versions sans rien effacer ni sanctionner', async () => {
      const { service, update } = build();

      const res = await service.contester('client', 'sin-1', 'La rayure existait avant mon depart');

      expect(update.mock.calls[0][0].data).toMatchObject({
        resolution: 'conteste',
        contestReason: 'La rayure existait avant mon depart',
      });
      // La declaration reste : type, description et auteur ne sont pas touches.
      expect(res.type).toBeUndefined();
      expect(update.mock.calls[0][0].data.description).toBeUndefined();
      expect(update.mock.calls[0][0].data.declaredBy).toBeUndefined();
    });

    it('refuse une seconde contestation', async () => {
      const { service } = build({ sinistre: { contestedAt: hier } });

      await expect(service.contester('client', 'sin-1', 'encore moi')).rejects.toThrow(
        /deja conteste/,
      );
    });

    it('refuse au-dela de quatorze jours apres la declaration', async () => {
      const { service } = build({ sinistre: { declaredAt: new Date(Date.now() - 15 * JOUR) } });

      await expect(service.contester('client', 'sin-1', 'trop tard')).rejects.toThrow(
        /Delai de contestation/,
      );
    });

    it('n a plus rien a contester quand l agence a retire sa declaration', async () => {
      const { service } = build({ sinistre: { resolution: 'abandonne' } });

      await expect(service.contester('client', 'sin-1', 'motif')).rejects.toThrow(/retire/);
    });
  });

  describe('arbitrage', () => {
    it('reste le seul chemin vers une resolution : rien ne bascule tout seul', async () => {
      const { service, update } = build({ sinistre: { resolution: 'conteste' } });

      await service.arbitrer('admin', 'sin-1', 'abandonne');

      expect(update.mock.calls[0][0].data).toMatchObject({
        resolution: 'abandonne',
        resolvedBy: 'admin',
      });
    });
  });
});
