import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export class CreateIntentDto {
  @IsString() bookingId: string;
}
export class RefundDto {
  @IsOptional() @IsNumber() amount?: number;
}

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @ApiOperation({ summary: 'Bloquer le paiement (hold) pour une reservation' })
  createIntent(@Body() dto: CreateIntentDto) {
    return this.paymentsService.createPaymentIntent(dto.bookingId);
  }

  @Get('booking/:bookingId')
  byBooking(@Param('bookingId') bookingId: string) {
    return this.paymentsService.findByBooking(bookingId);
  }

  @Post(':id/capture')
  capture(@Param('id') id: string) {
    return this.paymentsService.capture(id);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.paymentsService.refund(id, dto.amount);
  }
}
