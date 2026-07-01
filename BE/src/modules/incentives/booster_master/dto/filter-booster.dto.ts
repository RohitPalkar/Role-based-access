import { CommonFindAllQueryDto } from '../../../../helpers/dto/commonFindAll.dto';
import { IsOptional, IsNumber, IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ToNumberArray } from 'src/utils/transformers';

export class FilterBoosterDTO extends CommonFindAllQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  groupId?: number;

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  projectId?: number[];
}
