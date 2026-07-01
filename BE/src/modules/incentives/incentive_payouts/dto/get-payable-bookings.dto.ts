import { IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';
import { CommonFindAllQueryDto } from '../../../../helpers/dto/commonFindAll.dto';
import { UnitStatusEnum } from '../../../../enums/booking-list.enums';
import { ToNumberArray } from 'src/utils/transformers';

export class PayableBookingsQueryDto extends CommonFindAllQueryDto {
  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  brandIds?: number[];

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  projectIds?: number[];

  @IsOptional()
  unitStatus?: UnitStatusEnum;

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  rmIds?: number[];
}
