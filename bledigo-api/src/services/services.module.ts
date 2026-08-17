import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersService } from './providers.service';
import { VehiclesService } from './vehicles.service';
import { ServiceBookingsService } from './service-bookings.service';
import { ServiceReviewsService } from './reviews.service';
import { IncidentsService } from './incidents.service';
import {
  AdminProvidersController,
  ProviderSpaceController,
  ServicesController,
  ProviderApplicationController,
} from './services.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    ProvidersService,
    VehiclesService,
    ServiceBookingsService,
    ServiceReviewsService,
    IncidentsService,
  ],
  controllers: [
    AdminProvidersController,
    ProviderSpaceController,
    ServicesController,
    ProviderApplicationController,
  ],
  exports: [ProvidersService, VehiclesService, ServiceReviewsService],
})
export class ServicesModule {}
