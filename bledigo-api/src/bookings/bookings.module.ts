import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { RefusalGuardService } from './refusal-guard.service';
import { NoShowGuardService } from './no-show-guard.service';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module';
import { ListingsModule } from '../listings/listings.module';

@Module({
  // Le motif de refus est un texte libre : il passe par le filtre anti-fraude,
  // comme tous les autres champs saisis par un utilisateur.
  imports: [PrismaModule, AntiFraudModule, ListingsModule],
  providers: [BookingsService, RefusalGuardService, NoShowGuardService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
