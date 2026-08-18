import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IncidentsService } from './incidents.service';
import { ProviderIncidentsController, ClientIncidentsController } from './incidents.controller';

/** Sinistres constates au retour d un vehicule. */
@Module({
  imports: [PrismaModule],
  providers: [IncidentsService],
  controllers: [ProviderIncidentsController, ClientIncidentsController],
  exports: [IncidentsService],
})
export class IncidentsModule {}
