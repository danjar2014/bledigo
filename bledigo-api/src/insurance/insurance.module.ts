import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InsuranceService],
  controllers: [InsuranceController],
  exports: [InsuranceService],
})
export class InsuranceModule {}
