import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import {
  EoiLeaderboardView,
  EoiLeaderboardSortBy,
} from 'src/enums/eoi-form.enums';
import { ToNumberArray } from 'src/utils/transformers';

export class EoiLeaderboardFilterDto extends CommonFindAllQueryDto {
  @IsNotEmpty()
  @IsEnum(EoiLeaderboardView)
  view: EoiLeaderboardView;

  @IsOptional()
  @IsEnum(EoiLeaderboardSortBy)
  sortBy?: EoiLeaderboardSortBy;

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  campaignId?: number[];

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  channelPartnerId?: number[];

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  rmId?: number[];

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  userGroupId?: number[];
}
