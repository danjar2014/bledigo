import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Recherche multi-criteres (texte, geo, dates, prix)' })
  search(@Query() q: any) {
    return this.searchService.search(q);
  }

  @Get('suggestions')
  suggestions(@Query('q') q: string) {
    return this.searchService.suggestions(q);
  }
}
