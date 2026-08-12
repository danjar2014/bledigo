import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { FeaturesService } from './features.service';
import { ScoringService } from './scoring.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AiService, FeaturesService, ScoringService],
  controllers: [AiController],
  exports: [AiService, FeaturesService, ScoringService],
})
export class AiModule {}
