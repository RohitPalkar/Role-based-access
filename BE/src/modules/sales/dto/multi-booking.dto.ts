import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsInt,
  IsIn,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import { AmountAdjustmentEnum } from 'src/enums/booking-form-status.enum';

export class GetGroupInfoDto extends CommonFindAllQueryDto {
  @IsNotEmptyTrimmed()
  @IsString()
  id: string;
}

export class GetGroupDetailsDto {
  @IsNotEmptyTrimmed()
  @IsString()
  id: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateUpdateGroupDto {
  @IsNotEmptyTrimmed()
  @IsString()
  groupName?: string;

  @IsNotEmptyTrimmed()
  @IsInt()
  @Type(() => Number)
  noOfUnits?: number;

  @IsNotEmptyTrimmed()
  @IsString({ each: true })
  groupedOppoId?: string[];

  @IsNotEmptyTrimmed()
  @IsString()
  @IsIn([AmountAdjustmentEnum.LUMPSUM, AmountAdjustmentEnum.DISTINCT])
  paymentMethod: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount: number;
}
