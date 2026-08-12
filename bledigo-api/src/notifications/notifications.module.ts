import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationFeedService } from './feed.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, NotificationFeedService],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationFeedService],
})
export class NotificationsModule {}
