import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  mine(@CurrentUser('id') me: string) {
    return this.service.listForUser(me);
  }

  @Post('test')
  test(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.service.send(me, dto.channel || 'in_app', dto.template || 'test', dto.payload || {});
  }
}
