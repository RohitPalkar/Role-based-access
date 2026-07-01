import { ToNumberArray } from 'src/utils/transformers';
import { CommonFindAllQueryDto } from '../../../../helpers/dto/commonFindAll.dto';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class GetAllPolicyDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsString()
  groupId?: number;

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  regionIds?: number[];
}
