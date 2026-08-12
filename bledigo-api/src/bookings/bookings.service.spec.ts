import { BookingsService } from './bookings.service';

/**
 * Qui accepte une reservation.
 *
 * Une demande n est acceptee que par l hote, ou d emblee s il a coche
 * "reservation instantanee". Rien d autre ne doit la faire basculer : c est
 * l acceptation qui declenche l echange des coordonnees, et un contournement
 * livrait l email de l hote a quiconque cliquait sur Reserver.
 */
describe('BookingsService - statut a la creation', () => {
  function build(instantBook: boolean) {
    const create = jest.fn().mockImplementation(({ data }) => ({ id: 'b-1', ...data, listing: {} }));
    const prisma = {
      listing: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'l-1',
          ownerId: 'hote',
          maxGuests: 4,
          cleaningFee: 40,
          serviceFee: 18,
          currency: 'TND',
          instantBook,
        }),
      },
      booking: { findMany: jest.fn().mockResolvedValue([]), create },
      listingCalendar: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const calendar = {
      tarifer: jest.fn().mockResolvedValue({ nuits: 3, minNights: 1, basePrice: 540 }),
    };
    const service = new BookingsService(
      prisma as any,
      {} as any,
      {} as any,
      calendar as any,
      {} as any,
    );
    return { service, create };
  }

  const demande = {
    listingId: 'l-1',
    checkIn: '2026-11-10',
    checkOut: '2026-11-13',
    guestsCount: 2,
  };

  it('laisse la demande en attente quand la reservation instantanee est decochee', async () => {
    const { service, create } = build(false);

    await service.create('voyageur', demande as any);

    expect(create.mock.calls[0][0].data.status).toBe('pending');
  });

  it('accepte d emblee quand l hote a coche la reservation instantanee', async () => {
    const { service, create } = build(true);

    await service.create('voyageur', demande as any);

    expect(create.mock.calls[0][0].data.status).toBe('confirmed');
  });
});
