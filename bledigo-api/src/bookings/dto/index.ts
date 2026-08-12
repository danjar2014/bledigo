import { IsString, IsInt, IsDateString, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsString() listingId: string;
  @IsDateString() checkIn: string;
  @IsDateString() checkOut: string;
  @IsInt() @Min(1) @Type(() => Number) guestsCount: number;
}

export class ValidateBookingDto {
  @IsBoolean() conform: boolean;
  @IsBoolean() photosConform: boolean;
  @IsBoolean() locationConform: boolean;
  @IsBoolean() amenitiesPresent: boolean;
  @IsBoolean() clean: boolean;
  @IsOptional() @IsString() comment?: string;
}

/**
 * Refus du logement a l arrivee : la reservation est annulee et rien n est
 * preleve. Les memes criteres que la validation sont exiges, pour que le motif
 * du refus soit trace et opposable.
 */
export class RefuseBookingDto {
  @IsBoolean() conform: boolean;
  @IsBoolean() photosConform: boolean;
  @IsBoolean() locationConform: boolean;
  @IsBoolean() amenitiesPresent: boolean;
  @IsBoolean() clean: boolean;
  @IsOptional() @IsString() reason?: string;
}
