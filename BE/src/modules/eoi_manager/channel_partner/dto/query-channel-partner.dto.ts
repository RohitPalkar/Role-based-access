import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { ToNumberArray } from 'src/utils/transformers';

export class QueryChannelPartnerDto extends CommonFindAllQueryDto {
  // Only page, limit, search, and sortBy are inherited from CommonFindAllQueryDto
  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  createdBy?: number[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  campaignId?: number;

  @IsOptional()
  @IsString()
  cpStatus?: string;

  @IsOptional()
  @IsString()
  cpType?: string;
}
