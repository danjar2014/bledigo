import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { InsuranceType } from '../common/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('insurance')
@Controller('api/v1/insurance')
export class InsuranceController {
  constructor(private readonly service: InsuranceService) {}

  @Get('booking/:bookingId/quotes')
  quotes(@Param('bookingId') bookingId: string) {
    return this.service.quoteForBooking(bookingId);
  }

  @Get('booking/:bookingId')
  byBooking(@Param('bookingId') bookingId: string) {
    return this.service.findByBooking(bookingId);
  }

  @Post('booking/:bookingId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  subscribe(@Param('bookingId') bookingId: string, @Body('type') type: InsuranceType) {
    return this.service.subscribe(bookingId, type);
  }
}
