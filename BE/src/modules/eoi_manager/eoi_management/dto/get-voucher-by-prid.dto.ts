import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class GetVoucherByPridDto {
  @IsNotEmptyTrimmed({ message: 'prid is required' })
  @IsString({ message: 'prid must be a string' })
  prid: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'campaignId must be a number' })
  campaignId: number;
}
