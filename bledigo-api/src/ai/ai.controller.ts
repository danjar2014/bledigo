import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ai')
@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('listings/:id/score')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Recalculer le score de confiance d une annonce' })
  score(@Param('id') id: string) {
    return this.service.scoreListing(id);
  }

  @Get('listings/:id/fraud')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  fraud(@Param('id') id: string) {
    return this.service.detectFraud(id);
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
