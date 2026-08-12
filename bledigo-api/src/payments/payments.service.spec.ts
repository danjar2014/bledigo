import { PaymentsService } from './payments.service';

/**
 * Bloquer un montant n accepte pas une reservation, et ne se fait pas sur la
 * reservation d autrui.
 *
 * Ces deux regles se tenaient : la route confirmait la reservation en effet de
 * bord, et n exigeait aucun lien entre l appelant et la reservation.
 */
describe('PaymentsService - creation d intention', () => {
  const reservation = {
    id: 'b-1',
    travelerId: 'voyageur',
    ownerId: 'hote',
    totalPrice: 598,
    currency: 'TND',
    status: 'pending',
  };

  function build() {
    const findFirst = jest.fn().mockImplementation(({ where }) => {
      const parties = where.OR.map((o: any) => o.travelerId ?? o.ownerId);
      return parties.includes('voyageur') || parties.includes('hote') ? reservation : null;
    });
    const update = jest.fn().mockResolvedValue(reservation);
    const prisma = {
      booking: { findFirst, update },
      payment: { upsert: jest.fn().mockResolvedValue({ id: 'p-1' }) },
    };
    // Sans STRIPE_SECRET_KEY le service reste en mode simule, aucun appel reseau.
    delete process.env.STRIPE_SECRET_KEY;
    return { service: new PaymentsService(prisma as any), update, findFirst };
  }

  it('ne confirme pas la reservation', async () => {
    const { service, update } = build();

    await service.createPaymentIntent('b-1', 'voyageur');

    expect(update).toHaveBeenCalled();
    expect(update.mock.calls[0][0].data.status).toBeUndefined();
    expect(update.mock.calls[0][0].data.paymentStatus).toBe('held');
  });

  it('refuse un appelant etranger a la reservation', async () => {
    const { service } = build();

    await expect(service.createPaymentIntent('b-1', 'inconnu')).rejects.toThrow(
      /non trouvee/,
    );
  });
});
