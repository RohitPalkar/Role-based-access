import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
export class SaveAgreementDetailsDto {
  @IsString()
  opportunityId: string;

  @IsNumber()
  @Type(() => Number)
  voucherId: number;

  @IsNumber()
  @Type(() => Number)
  agreementValue?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bookingAmount?: number;
}
