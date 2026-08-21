import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ListingsModule } from '../listings/listings.module';
import { VehiclesModule } from '../services/vehicles/vehicles.module';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestsController } from './change-requests.controller';

/**
 * Demandes d annulation et de changement de dates, pour les sejours comme pour
 * les locations.
 *
 * Module a part plutot qu ajout dans BookingsModule : le flux traverse les deux
 * metiers, et le loger dans l un des deux aurait force l autre a en dependre.
 */
@Module({
  imports: [PrismaModule, ListingsModule, VehiclesModule],
  providers: [ChangeRequestsService],
  controllers: [ChangeRequestsController],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
