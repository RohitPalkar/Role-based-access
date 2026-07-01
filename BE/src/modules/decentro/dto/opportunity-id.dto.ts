import { Type } from 'class-transformer';
import { IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class OpportunityIdDto {
  @IsNotEmptyTrimmed()
  @IsString()
  @Type(() => String)
  opportunityId: string;
}
