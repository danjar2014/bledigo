import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationFeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly feedService: NotificationFeedService,
  ) {}

  /**
   * Alimente la cloche. Couvre les deux casquettes d un meme compte : un
   * proprietaire qui voyage aussi voit les deux familles d evenements.
   */
  @Get('feed')
  feed(@CurrentUser('id') me: string) {
    return this.feedService.feed(me);
  }

  @Get()
  mine(@CurrentUser('id') me: string) {
    return this.service.listForUser(me);
  }

  @Post('test')
  test(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.service.send(me, dto.channel || 'in_app', dto.template || 'test', dto.payload || {});
  }
}
