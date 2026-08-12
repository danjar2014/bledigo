import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CalendarService } from './calendar.service';
import { ListingsController } from './listings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module';

@Module({
  imports: [PrismaModule, AntiFraudModule],
  providers: [ListingsService, CalendarService],
  controllers: [ListingsController],
  exports: [ListingsService, CalendarService],
})
export class ListingsModule {}
