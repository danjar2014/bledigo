import { Module } from '@nestjs/common';
import { ReverseSearchService } from './reverse-search.service';
import { ReverseSearchController } from './reverse-search.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module';

@Module({
  imports: [PrismaModule, AntiFraudModule],
  providers: [ReverseSearchService],
  controllers: [ReverseSearchController],
  exports: [ReverseSearchService],
})
export class ReverseSearchModule {}
