import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VehiclesService } from './vehicles.service';
import { VehiclesController, VehicleCatalogController } from './vehicles.controller';

/** Flotte des agences de location : vehicules, photos, calendrier, catalogue. */
@Module({
  imports: [PrismaModule],
  providers: [VehiclesService],
  controllers: [VehiclesController, VehicleCatalogController],
  exports: [VehiclesService],
})
export class VehiclesModule {}
