import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReverseSearchService } from './reverse-search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reverse-search')
@Controller('api/v1/reverse-searches')
export class ReverseSearchController {
  constructor(private readonly service: ReverseSearchService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.service.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.service.create(me, dto);
  }

  @Post(':id/offers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  offer(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.offer(me, id, dto);
  }

  @Post('offers/:offerId/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser('id') me: string, @Param('offerId') offerId: string) {
    return this.service.acceptOffer(me, offerId);
  }
}
