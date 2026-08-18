import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceBookingsService } from './service-bookings.service';
import { ProviderRequestsController, ServicesController } from './bookings.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ProvidersModule } from '../providers/providers.module';

/**
 * Demandes de prestation, communes aux deux metiers.
 *
 * Ce module depend des deux autres et non l inverse : une demande a besoin de
 * savoir tarifer un vehicule et rapprocher un prestataire, alors qu un vehicule
 * n a aucun besoin de connaitre les demandes.
 */
@Module({
  imports: [PrismaModule, VehiclesModule, ProvidersModule],
  providers: [ServiceBookingsService],
  controllers: [ProviderRequestsController, ServicesController],
  exports: [ServiceBookingsService],
})
export class ServiceBookingsModule {}
