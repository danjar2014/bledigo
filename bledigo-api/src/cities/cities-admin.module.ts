import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CitiesAdminService } from './cities-admin.service';
import { CitiesAdminController } from './cities-admin.controller';

/** Referentiel des villes, administrable. */
@Module({
  imports: [PrismaModule],
  providers: [CitiesAdminService],
  controllers: [CitiesAdminController],
  exports: [CitiesAdminService],
})
export class CitiesAdminModule {}
