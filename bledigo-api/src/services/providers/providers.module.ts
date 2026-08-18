import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersService } from './providers.service';
import { ZonesService } from './zones.service';
import { AvailabilityService } from './availability.service';
import {
  AdminProvidersController,
  ProviderProfileController,
  ProviderApplicationController,
} from './providers.controller';

/** Le prestataire lui-meme : son compte, ses zones, ses horaires. */
@Module({
  imports: [PrismaModule],
  providers: [ProvidersService, ZonesService, AvailabilityService],
  controllers: [AdminProvidersController, ProviderProfileController, ProviderApplicationController],
  exports: [ProvidersService, ZonesService, AvailabilityService],
})
export class ProvidersModule {}
