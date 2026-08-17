import { IsString, IsInt, IsDateString, IsBoolean, IsOptional, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsString() listingId: string;
  @IsDateString() checkIn: string;
  @IsDateString() checkOut: string;
  @IsInt() @Min(1) @Type(() => Number) guestsCount: number;
}

/**
 * Extension d un sejour : seule la date de depart change.
 *
 * Ni le nombre de voyageurs ni la date d arrivee ne sont acceptes ici. Modifier
 * l arrivee d un sejour commence n a pas de sens, et changer le nombre
 * d occupants est une autre decision, avec sa propre limite de capacite — les
 * melanger ferait passer une hausse d effectif pour une simple prolongation.
 */
export class ExtendBookingDto {
  @IsDateString() checkOut: string;
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
  /**
   * Motif OBLIGATOIRE, contrairement au commentaire de validation.
   *
   * Il ne coute rien a une victime reelle, qui a beaucoup a dire, mais oblige
   * une entente a fabriquer un mensonge ecrit, date et opposable. C est aussi
   * la seule piece dont disposera l arbitrage si l hote conteste.
   */
  @IsString() @MinLength(15, { message: 'Decrivez en quelques mots ce qui ne va pas (15 caracteres minimum)' })
  reason: string;
}
