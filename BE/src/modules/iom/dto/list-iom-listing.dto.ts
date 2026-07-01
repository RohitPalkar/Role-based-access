import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { ToNumberArray } from 'src/utils/transformers';
import { LoyaltyPointsReleaseTypeEnum } from '../enums/iom.enums';
import { Transform } from 'class-transformer';

export class ListIomListingDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsIn([
    'eligible',
    'ioms',
    'iomRequestInvoice',
    'pendingSubmission',
    'submittedInvoice',
  ])
  listType?:
    | 'eligible'
    | 'ioms'
    | 'iomRequestInvoice'
    | 'pendingSubmission'
    | 'submittedInvoice';

  @IsOptional()
  @IsString()
  iomStatus?: 'string';

  @IsOptional()
  invoiceStatus?: 'number';

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  projects?: number[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(LoyaltyPointsReleaseTypeEnum, {
    message: 'invalid classification type',
  })
  pointsClassification?: LoyaltyPointsReleaseTypeEnum;
}
