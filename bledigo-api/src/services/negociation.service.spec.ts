import { ServiceBookingsService } from './service-bookings.service';

/**
 * Negociation du tarif d une prestation de menage.
 *
 * Ce qui se teste ici n est pas l arithmetique — il n y en a pas — mais les
 * quatre refus qui font la difference entre une negociation et une porte
 * ouverte : on n accepte pas son propre chiffre, on ne renegocie pas ce qui est
 * accepte, on ne negocie pas une location tarifee par calendrier, et une
 * demande ne reste pas ouverte indefiniment.
 */
describe('ServiceBookingsService - negociation du menage', () => {
  const DEMANDE = {
    id: 's-1',
    type: 'menage',
    status: 'pending',
    requesterId: 'hote',
    providerId: 'p-1',
    price: 0,
    proposedPrice: null as number | null,
    counterPrice: null as number | null,
    negotiationRound: 0,
    note: null as string | null,
    provider: { id: 'p-1', userId: 'prestataire' },
  };

  function build(surcharge: any = {}) {
    const demande = { ...DEMANDE, ...surcharge };
    const update = jest.fn().mockImplementation(({ data }) => ({ ...demande, ...data }));
    const prisma = {
      serviceBooking: { findFirst: jest.fn().mockResolvedValue(demande), update },
    };
    const service = new ServiceBookingsService(prisma as any, {} as any);
    return { service, update };
  }

  describe('contre-proposition', () => {
    it('ecrit dans la colonne du prestataire quand c est lui qui repond', async () => {
      const { service, update } = build({ proposedPrice: 80 });

      await service.contreProposer('prestataire', 's-1', 120);

      const ecrit = update.mock.calls[0][0].data;
      expect(ecrit.counterPrice).toBe(120);
      // La proposition de l hote n est pas ecrasee : chaque camp garde son
      // dernier chiffre, sans quoi on ne saurait plus qui a dit quoi.
      expect(ecrit.proposedPrice).toBeUndefined();
      expect(ecrit.negotiationRound).toEqual({ increment: 1 });
    });

    it('ecrit dans la colonne de l hote quand c est lui qui revient', async () => {
      const { service, update } = build({ proposedPrice: 80, counterPrice: 120 });

      await service.contreProposer('hote', 's-1', 100);

      expect(update.mock.calls[0][0].data.proposedPrice).toBe(100);
      expect(update.mock.calls[0][0].data.counterPrice).toBeUndefined();
    });

    it('borne la negociation, faute de quoi le creneau reste bloque sans fin', async () => {
      const { service } = build({ negotiationRound: 3 });

      await expect(service.contreProposer('hote', 's-1', 90)).rejects.toThrow(/Negociation close/);
    });

    it('refuse de renegocier une demande deja acceptee', async () => {
      const { service } = build({ status: 'confirmed', price: 100 });

      await expect(service.contreProposer('hote', 's-1', 60)).rejects.toThrow(/fige/);
    });

    it('refuse de negocier une location, tarifee par le calendrier du vehicule', async () => {
      const { service } = build({ type: 'location_voiture' });

      await expect(service.contreProposer('hote', 's-1', 200)).rejects.toThrow(/que le menage/);
    });
  });

  describe('acceptation', () => {
    it('fige le tarif de l hote quand le prestataire accepte', async () => {
      const { service, update } = build({ proposedPrice: 80 });

      await service.accepter('prestataire', 's-1');

      expect(update.mock.calls[0][0].data).toMatchObject({
        status: 'confirmed',
        price: 80,
      });
      expect(update.mock.calls[0][0].data.contactSharedAt).toBeInstanceOf(Date);
    });

    /**
     * Le test qui justifie l acceptation symetrique. Sans elle, la
     * contre-proposition du prestataire n aurait aucune issue : il ne peut pas
     * accepter son propre prix, et l hote n avait pas de bouton.
     */
    it('fige le tarif du prestataire quand c est l hote qui accepte', async () => {
      const { service, update } = build({ proposedPrice: 80, counterPrice: 120 });

      await service.accepter('hote', 's-1');

      expect(update.mock.calls[0][0].data.price).toBe(120);
    });

    it('refuse d accepter quand l autre camp n a rien propose', async () => {
      const { service } = build({ proposedPrice: null });

      await expect(service.accepter('prestataire', 's-1')).rejects.toThrow(/Aucun tarif propose/);
    });

    it('n autorise que l agence a accepter une location', async () => {
      const { service } = build({ type: 'location_voiture' });

      await expect(service.accepter('hote', 's-1')).rejects.toThrow(/Seule l agence/);
    });

    it('ne touche pas au prix d une location, deja tarifee', async () => {
      const { service, update } = build({ type: 'location_voiture', price: 450 });

      await service.accepter('prestataire', 's-1');

      expect(update.mock.calls[0][0].data.price).toBeUndefined();
    });
  });
});
