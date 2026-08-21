import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService, Appelant } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('ai')
@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('listings/:id/score')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Recalculer le score de confiance d une annonce. Reserve a son proprietaire et a l administration.',
  })
  score(@Param('id') id: string, @CurrentUser() moi: Appelant) {
    return this.service.scoreListing(id, moi);
  }

  @Get('listings/:id/fraud')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Signaux d anti-fraude d une annonce. Reserve a son proprietaire et a l administration : ils portent sur la personne du proprietaire.',
  })
  fraud(@Param('id') id: string, @CurrentUser() moi: Appelant) {
    return this.service.detectFraud(id, moi);
  }

  @Get('price-suggestion')
  price(
    @Query('city') city: string,
    @Query('propertyType') propertyType: string,
    @Query('bedrooms') bedrooms = 1,
  ) {
    return this.service.suggestPrice(city, propertyType, Number(bedrooms));
  }
}
