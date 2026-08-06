import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '../common/enums';
import Stripe from 'stripe';

/**
 * Paiement "Hold & Capture" : l'argent est bloque a la reservation,
 * capture seulement apres validation du sejour par le voyageur.
 *
 * Sans STRIPE_SECRET_KEY, le service bascule en mode simule (dev local).
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;
  readonly simulated: boolean;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY;
    this.simulated = !key;
    this.stripe = key ? new Stripe(key, { apiVersion: '2024-06-20' as any }) : null;
    if (this.simulated) {
      this.logger.warn('STRIPE_SECRET_KEY absent : paiements en mode simule');
    }
  }

  async createPaymentIntent(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Reservation non trouvee');

    const amountCents = Math.round(Number(booking.totalPrice) * 100);
    let intentId: string;
    let clientSecret: string;

    if (this.stripe) {
      const intent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: booking.currency.toLowerCase(),
        capture_method: 'manual',
        metadata: { bookingId: booking.id },
      });
      intentId = intent.id;
      clientSecret = intent.client_secret || '';
    } else {
      intentId = `pi_sim_${booking.id.slice(0, 8)}_${Date.now()}`;
      clientSecret = `${intentId}_secret_sim`;
    }

    const payment = await this.prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        stripePaymentIntentId: intentId,
        amount: Number(booking.totalPrice),
        currency: booking.currency,
        status: PaymentStatus.held,
        heldAt: new Date(),
      },
      update: { stripePaymentIntentId: intentId, status: PaymentStatus.held, heldAt: new Date() },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: PaymentStatus.held, status: 'confirmed' },
    });

    return { clientSecret, paymentIntentId: intentId, paymentId: payment.id, simulated: this.simulated };
  }

  async capture(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement non trouve');
    if (this.stripe) await this.stripe.paymentIntents.capture(payment.stripePaymentIntentId);
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.captured, capturedAt: new Date() },
    });
  }

  async refund(paymentId: string, amount?: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement non trouve');

    if (this.stripe) {
      await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });
    }

    const partial = amount != null && amount < Number(payment.amount);
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: partial ? PaymentStatus.partial_refund : PaymentStatus.refunded,
        refundedAt: new Date(),
        refundAmount: amount ?? Number(payment.amount),
      },
    });
  }

  async findByBooking(bookingId: string) {
    return this.prisma.payment.findUnique({ where: { bookingId } });
  }
}
