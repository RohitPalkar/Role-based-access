import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class GetVoucherByEnquiryIdDto {
  @IsNotEmptyTrimmed({ message: 'enqRefNo is required' })
  @IsInt({ message: 'enqRefNo must be a number' })
  @Type(() => Number)
  enqRefNo: number;

  @IsOptional()
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsString()
  sfdcProjectName?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isChangeRequest?: boolean = false;
}
