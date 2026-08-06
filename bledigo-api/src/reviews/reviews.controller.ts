import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('api/v1/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('listing/:listingId')
  byListing(@Param('listingId') listingId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.reviewsService.findByListing(listingId, Number(page), Number(limit));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.reviewsService.create(me, dto);
  }

  @Post(':id/flag')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  flag(@Param('id') id: string, @Body('reason') reason: string) {
    return this.reviewsService.flag(id, reason);
  }
}
