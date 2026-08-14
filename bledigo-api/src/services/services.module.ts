import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersService } from './providers.service';
import { VehiclesService } from './vehicles.service';
import { ServiceBookingsService } from './service-bookings.service';
import { ServiceReviewsService } from './reviews.service';
import {
  AdminProvidersController,
  ProviderSpaceController,
  ServicesController,
} from './services.controller';

@Module({
  imports: [PrismaModule],
  providers: [ProvidersService, VehiclesService, ServiceBookingsService, ServiceReviewsService],
  controllers: [AdminProvidersController, ProviderSpaceController, ServicesController],
  exports: [ProvidersService, VehiclesService, ServiceReviewsService],
})
export class ServicesModule {}
