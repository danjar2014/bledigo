import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceReviewsService } from './reviews.service';
import { ServiceReviewsController } from './reviews.controller';

/** Notation mutuelle des prestations. */
@Module({
  imports: [PrismaModule],
  providers: [ServiceReviewsService],
  controllers: [ServiceReviewsController],
  exports: [ServiceReviewsService],
})
export class ServiceReviewsModule {}
