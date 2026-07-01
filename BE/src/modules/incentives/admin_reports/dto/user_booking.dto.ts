import { IsOptional, IsNumber, IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CommonFindAllQueryDto } from '../../../../helpers/dto/commonFindAll.dto';
import {
  PaymentStatusEnum,
  UnitStatusEnum,
} from '../../../../enums/booking-list.enums';
import { ToNumberArray } from 'src/utils/transformers';

export class UserBookingsQueryDto extends CommonFindAllQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  projectIds?: number[];

  @IsOptional()
  unitStatus?: UnitStatusEnum;

  @IsOptional()
  incentiveStatus?: PaymentStatusEnum;

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  rmIds?: number[];
}
