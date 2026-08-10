import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('api/v1')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** Avis d un logement : tri (newest|helpful|highest|lowest), filtre par note. */
  @Get('listings/:id/reviews')
  byListingV2(@Param('id') listingId: string, @Query() query: any) {
    return this.reviewsService.findByListing(listingId, query);
  }

  /** Route historique conservee pour compatibilite. */
  @Get('reviews/listing/:listingId')
  byListing(@Param('listingId') listingId: string, @Query() query: any) {
    return this.reviewsService.findByListing(listingId, query);
  }

  @Post('reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.reviewsService.create(me, dto);
  }

  @Post('reviews/:id/helpful')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markHelpful(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.reviewsService.markHelpful(id, me);
  }

  @Post('reviews/:id/flag')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  flag(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: any) {
    return this.reviewsService.flagReview(me, id, dto?.reason);
  }
}
