import {
  IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsEmail, IsIn, Min, Max, IsDateString,
  MaxLength, MinLength, Matches, IsArray,
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
  /** OBSOLETE : la galerie passe par les routes `photos`. Conserve pour ne pas
   *  casser les appels existants. */
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsIn(['active', 'maintenance', 'retire']) status?: string;

  /**
   * Conditions de location. Elles sont servies au voyageur AVANT la demande,
   * pour la meme raison que les conditions d annulation d un sejour : une
   * condition decouverte au comptoir est inopposable.
   */
  /** Absent = kilometrage illimite. Surtout pas 0, qui interdirait de rouler. */
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) kmPerDay?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) extraKmPrice?: number;
  @IsOptional() @IsInt() @Min(18) @Max(99) @Type(() => Number) minDriverAge?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) @Type(() => Number) minLicenceYears?: number;
  @IsOptional() @IsIn(['plein_a_plein', 'plein_a_vide', 'identique']) fuelPolicy?: string;
  @IsOptional() @IsArray() options?: { code: string; label: string; pricePerDay: number }[];
  @IsOptional() @IsString() @MaxLength(200) pickupLocation?: string;
  @IsOptional() @IsString() @MaxLength(200) returnLocation?: string;
  @IsOptional() @IsBoolean() deliveryAvailable?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) deliveryFee?: number;
}

/** Une photo de la galerie d un vehicule. */
export class VehiclePhotoDto {
  @IsString() url: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
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

/**
 * Demande de prestation, cote voyageur ou cote hote.
 *
 * `startDate` et `endDate` portent l HEURE pour un menage : c est le creneau
 * d intervention. Une prestation de menage sans horaire oblige le prestataire a
 * rappeler pour savoir quand venir, ce qui vide la demande de son sens.
 */
export class DemandeServiceDto {
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;

  /**
   * Ou intervenir. Ville et gouvernorat se deduisent du logement cote serveur —
   * les accepter ici permettrait de declarer une zone qui n est pas celle du
   * bien. Seuls le quartier et la precision d acces sont saisis.
   */
  @IsOptional() @IsString() @MaxLength(120) district?: string;
  @IsOptional() @IsString() @MaxLength(300) addressHint?: string;

  /**
   * Tarif propose par le demandeur. Facultatif : un hote qui ne sait pas
   * combien coute un menage dans sa ville laisse le prestataire chiffrer.
   */
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) proposedPrice?: number;
}

/**
 * Declaration de sinistre par l agence.
 *
 * La description est OBLIGATOIRE et substantielle, pour la meme raison que le
 * motif d un refus de logement : elle ne coute rien a une agence qui a
 * reellement constate un dommage, et oblige celle qui invente a l ecrire, date
 * et opposable. C est aussi la seule piece dont disposera l arbitrage.
 */
export class DeclarerSinistreDto {
  @IsIn(['rayure', 'choc', 'mecanique', 'retard', 'carburant', 'proprete', 'autre'])
  type: string;
  @IsString()
  @MaxLength(2000)
  @MinLength(20, { message: 'Decrivez le dommage constate (20 caracteres minimum)' })
  description: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) estimatedCost?: number;
  /** URLs des photos du dommage. La preuve vaut mieux que l assertion. */
  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];
}

/** Contestation par le client. Le motif est exige des deux cotes, symetriquement. */
export class ContesterSinistreDto {
  @IsString()
  @MaxLength(2000)
  @MinLength(20, { message: 'Expliquez ce que vous contestez (20 caracteres minimum)' })
  motif: string;
}

/**
 * Contre-proposition du prestataire, ou reponse de l hote.
 *
 * Un seul montant : la zone et le creneau ne se renegocient pas. Deplacer
 * l intervention est une autre demande, pas un ajustement de prix — les
 * melanger ferait passer un changement de jour pour une remise.
 */
export class ContreProposerDto {
  @IsNumber() @Min(0) @Type(() => Number) price: number;
  @IsOptional() @IsString() @MaxLength(500) message?: string;
}
