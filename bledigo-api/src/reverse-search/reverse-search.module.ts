import { Module } from '@nestjs/common';
import { ReverseSearchService } from './reverse-search.service';
import { ReverseSearchController } from './reverse-search.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ReverseSearchService],
  controllers: [ReverseSearchController],
  exports: [ReverseSearchService],
})
export class ReverseSearchModule {}
