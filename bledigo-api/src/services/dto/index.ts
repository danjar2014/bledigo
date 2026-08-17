import {
  IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsEmail, IsIn, Min, Max, IsDateString,
  MaxLength, Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderType, ProviderLegalForm } from '../../common/enums';

/** Creation d un compte prestataire par l administration. */
export class CreateProviderDto {
  @IsEmail() email: string;
  @IsString() @MaxLength(120) companyName: string;
  @IsIn([ProviderType.menage, ProviderType.location_voiture]) type: string;
  /**
   * societe par defaut. `individuel` n est accepte que pour le menage — la
   * verification metier est dans le service, pas ici : un DTO ne sait pas
   * exprimer une regle qui croise deux champs de facon lisible.
   */
  @IsOptional()
  @IsIn([ProviderLegalForm.societe, ProviderLegalForm.individuel])
  legalForm?: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  /** Matricule fiscal ou registre de commerce, constate a la main en phase 1. */
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsNumber() @Type(() => Number) latitude?: number;
  @IsOptional() @IsNumber() @Type(() => Number) longitude?: number;
  @IsOptional() @IsInt() @Min(1) @Max(500) @Type(() => Number) serviceRadiusKm?: number;
  @IsOptional() @IsString() phone?: string;
}

/**
 * Candidature spontanee depuis la page publique.
 *
 * Le telephone est OBLIGATOIRE ici, alors qu il est facultatif pour une
 * creation par l administration : sans envoi d email, c est le seul moyen de
 * recontacter la societe pour lui transmettre ses identifiants.
 */
export class CandidatureDto extends CreateProviderDto {
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numero de telephone invalide' })
  phone: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

/** Ce qu un prestataire peut changer lui-meme. Ni son type, ni son statut. */
export class UpdateProviderDto {
  @IsOptional() @IsString() @MaxLength(120) companyName?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsNumber() @Type(() => Number) latitude?: number;
  @IsOptional() @IsNumber() @Type(() => Number) longitude?: number;
  @IsOptional() @IsInt() @Min(1) @Max(500) @Type(() => Number) serviceRadiusKm?: number;
}

export class VehicleDto {
  @IsString() brand: string;
  @IsString() model: string;
  @IsOptional() @IsInt() @Min(1950) @Type(() => Number) year?: number;
  @IsOptional() @IsString() plate?: string;
  @IsOptional() @IsIn(['citadine', 'berline', 'suv', 'utilitaire', 'luxe']) category?: string;
  @IsOptional() @IsIn(['manuelle', 'automatique']) transmission?: string;
  @IsOptional() @IsIn(['essence', 'diesel', 'hybride', 'electrique']) fuel?: string;
  @IsOptional() @IsInt() @Min(1) @Max(9) @Type(() => Number) seats?: number;
  @IsOptional() @IsBoolean() airConditioned?: boolean;
  @IsNumber() @Min(0) @Type(() => Number) pricePerDay: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) deposit?: number;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsIn(['active', 'maintenance', 'retire']) status?: string;
}

export class UpdateVehicleDto extends VehicleDto {
  @IsOptional() @IsString() brand: string;
  @IsOptional() @IsString() model: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) pricePerDay: number;
}

/** Une periode du calendrier : fermeture, ou tarif substitue. */
export class VehiclePeriodDto {
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsBoolean() blocked?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) pricePerDay?: number;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

/**
 * Avis sur une prestation terminee.
 *
 * Le sens n est PAS un champ du corps : il se deduit de qui appelle. Le laisser
 * choisir permettrait a un prestataire de deposer un avis au nom de son client.
 */
export class NoterPrestationDto {
  @IsInt() @Min(1) @Max(5) @Type(() => Number) rating: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

/** Demande de prestation, cote voyageur ou cote hote. */
export class DemandeServiceDto {
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
