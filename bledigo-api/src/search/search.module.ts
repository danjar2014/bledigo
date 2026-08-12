import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { GeoService } from './geo.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [PrismaModule, ListingsModule],
  providers: [SearchService, CitiesService, GeoService],
  controllers: [SearchController, CitiesController],
  exports: [SearchService, CitiesService, GeoService],
})
export class SearchModule {}
