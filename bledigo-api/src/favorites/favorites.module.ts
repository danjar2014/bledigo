import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';

/** Favoris des voyageurs. */
@Module({
  imports: [PrismaModule],
  providers: [FavoritesService],
  controllers: [FavoritesController],
  exports: [FavoritesService],
})
export class FavoritesModule {}
