import { IsString, IsIn, IsOptional, IsDateString, IsBoolean, MaxLength } from 'class-validator';

/**
 * `forbidNonWhitelisted` est actif globalement : tout champ non declare ici
 * renvoie une 400 plutot que d etre ignore. Les DTO doivent donc etre complets,
 * et pas seulement corrects.
 */
export class CreateChangeRequestDto {
  @IsIn(['sejour', 'location']) scope: 'sejour' | 'location';
  @IsString() reservationId: string;
  @IsIn(['annulation', 'modification_dates']) kind: 'annulation' | 'modification_dates';

  /** Code d une liste fermee, voir common/cancellation-reasons.ts. */
  @IsString() reasonCode: string;

  /**
   * Obligatoire pour `autre`, verifie cote service : la regle depend du code
   * choisi, ce que les decorateurs ne savent pas exprimer seuls.
   */
  @IsOptional() @IsString() @MaxLength(1000) reasonText?: string;

  @IsOptional() @IsDateString() newStartDate?: string;
  @IsOptional() @IsDateString() newEndDate?: string;
}

export class RespondChangeRequestDto {
  @IsBoolean() accepte: boolean;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
