import { IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class GetReferredVoucherDto {
  @IsNotEmptyTrimmed({ message: 'campaignId is required' })
  @IsInt({ message: 'campaignId must be a number' })
  @Type(() => Number)
  campaignId: number;

  @IsNotEmptyTrimmed({ message: 'uniqueReferenceId is required' })
  @IsString({ message: 'uniqueReferenceId must be a string' })
  uniqueRefId: string;
}
