import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module';

@Module({
  // Le motif de refus est un texte libre : il passe par le filtre anti-fraude,
  // comme tous les autres champs saisis par un utilisateur.
  imports: [PrismaModule, AntiFraudModule],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
