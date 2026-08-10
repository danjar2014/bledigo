import { IsString, IsInt, IsNumber, IsBoolean, IsArray, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType, Currency, ListingStatus } from '../../common/enums';

export class CreateListingDto {
  @IsString() @MaxLength(150) title: string;
  @IsString() description: string;
  @IsString() address: string;
  @IsString() city: string;
  @IsString() region: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsNumber() @Type(() => Number) latitude: number;
  @IsNumber() @Type(() => Number) longitude: number;
  @IsEnum(PropertyType) propertyType: PropertyType;
  @IsInt() @Min(1) @Type(() => Number) maxGuests: number;
  @IsInt() @Min(0) @Type(() => Number) bedrooms: number;
  @IsInt() @Min(0) @Type(() => Number) bathrooms: number;
  @IsNumber() @Min(0) @Type(() => Number) pricePerNight: number;
  @IsOptional() @IsNumber() @Type(() => Number) cleaningFee?: number;
  @IsOptional() @IsNumber() @Type(() => Number) serviceFee?: number;
  @IsOptional() @IsNumber() @Type(() => Number) securityDeposit?: number;
  @IsOptional() @IsEnum(Currency) currency?: Currency;
  @IsOptional() @IsInt() @Type(() => Number) surfaceM2?: number;
  @IsOptional() @IsInt() @Type(() => Number) floors?: number;
  @IsOptional() @IsInt() @Type(() => Number) yearBuilt?: number;
  @IsOptional() @IsArray() amenities?: string[];
  /** [{ key, allowed }] : regle autorisee ou interdite. */
  @IsOptional() @IsArray() houseRules?: { key: string; allowed: boolean }[];
  /** Bloc libre : texte de precisions et proximites cochees. */
  @IsOptional() rules?: { text?: string; proximity?: string[] } & Record<string, any>;
  @IsOptional() @IsString() checkInTime?: string;
  @IsOptional() @IsString() checkOutTime?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) minNights?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) maxNights?: number;
  @IsOptional() @IsBoolean() instantBook?: boolean;
}

export class UpdateListingDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Type(() => Number) pricePerNight?: number;
  @IsOptional() @IsNumber() @Type(() => Number) cleaningFee?: number;
  @IsOptional() @IsInt() @Type(() => Number) maxGuests?: number;
  @IsOptional() @IsNumber() @Type(() => Number) serviceFee?: number;
  @IsOptional() @IsNumber() @Type(() => Number) securityDeposit?: number;
  @IsOptional() @IsArray() amenities?: string[];
  @IsOptional() @IsArray() houseRules?: { key: string; allowed: boolean }[];
  @IsOptional() @IsString() checkInTime?: string;
  @IsOptional() @IsString() checkOutTime?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) minNights?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) maxNights?: number;
  @IsOptional() @IsBoolean() instantBook?: boolean;
  /** Motif enregistre dans l historique de modification. */
  @IsOptional() @IsString() modificationReason?: string;
  @IsOptional() @IsEnum(ListingStatus) status?: ListingStatus;
}

export class QueryListingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() guests?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() certificationLevel?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() limit?: number = 20;
}
