import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ListingsModule } from './listings/listings.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { DisputesModule } from './disputes/disputes.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { ReverseSearchModule } from './reverse-search/reverse-search.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { MediaModule } from './media/media.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InsuranceModule } from './insurance/insurance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    BookingsModule,
    PaymentsModule,
    DisputesModule,
    ChatModule,
    SearchModule,
    ReverseSearchModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule,
    AiModule,
    MediaModule,
    SubscriptionsModule,
    InsuranceModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
