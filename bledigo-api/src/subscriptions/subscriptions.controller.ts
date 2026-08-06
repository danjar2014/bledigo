import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionType } from '../common/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@Controller('api/v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('plans')
  plans() {
    return this.service.plans();
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser('id') me: string) {
    return this.service.mine(me);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  subscribe(@CurrentUser('id') me: string, @Body('type') type: SubscriptionType) {
    return this.service.subscribe(me, type);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.service.cancel(me, id);
  }
}
