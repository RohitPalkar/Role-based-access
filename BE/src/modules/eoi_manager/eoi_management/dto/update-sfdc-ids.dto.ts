import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class UpdateSfdcIdsDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  voucherId: number;

  @IsOptional()
  @IsString({ message: 'Enquiry Id must be a string' })
  sfdcEnquiryId?: string;

  @IsOptional()
  @IsString({ message: 'opportunityId must be a string' })
  opportunityId?: string;
}
