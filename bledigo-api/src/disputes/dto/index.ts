import { IsString, IsEnum, IsOptional, IsNumber, IsArray } from 'class-validator';
import { DisputeType, DisputeStatus, EvidenceType } from '../../common/enums';

export class CreateDisputeDto {
  @IsString() bookingId: string;
  @IsEnum(DisputeType) type: DisputeType;
  @IsString() description: string;
}

export class AddEvidenceDto {
  @IsEnum(EvidenceType) type: EvidenceType;
  @IsString() url: string;
  @IsOptional() @IsString() description?: string;
}

export class DecideDisputeDto {
  @IsEnum(DisputeStatus) status: DisputeStatus;
  @IsString() resolutionNotes: string;
  @IsOptional() @IsNumber() refundAmount?: number;
  @IsOptional() @IsArray() sanctions?: any[];
}
