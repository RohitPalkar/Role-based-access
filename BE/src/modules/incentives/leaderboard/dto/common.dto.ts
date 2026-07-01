import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Matches,
  IsArray,
  IsInt,
  IsPositive,
  ArrayNotEmpty,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FINANCIAL_YEAR_FORMAT } from 'src/config/constants';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { UnitStatusEnum } from '../../../../enums/booking-list.enums';
import { ToNumberArray } from 'src/utils/transformers';

export enum LeaderboardType {
  BRAND = 'brand',
  PROJECT = 'project',
  CITY = 'city',
}

export class LeaderBoardQueryDto extends CommonFindAllQueryDto {
  @IsNotEmpty({ message: 'type parameter is required.' })
  @IsEnum(LeaderboardType, {
    message: 'Invalid type. Allowed values: brand, project, city.',
  })
  type: LeaderboardType;

  @IsNotEmpty({ message: 'id parameter is required.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Invalid id. It must be a number.' })
  id: number;

  @IsOptional()
  @Matches(FINANCIAL_YEAR_FORMAT, {
    message: 'financialYear must be in YYYY-YYYY format',
  })
  financialYear?: string;
}

export class TopTenRmQueryDto extends CommonFindAllQueryDto {
  @IsOptional()
  @Matches(FINANCIAL_YEAR_FORMAT, {
    message: 'financialYear must be in YYYY-YYYY format',
  })
  financialYear?: string;
}

export class RmSummaryQueryDto extends CommonFindAllQueryDto {
  @IsOptional()
  unitStatus?: UnitStatusEnum;

  @ToNumberArray()
  @IsOptional()
  @IsArray({ message: 'City IDs must be an array of IDs.' })
  @IsInt({ each: true, message: 'Each City ID must be a positive integer.' })
  @ArrayNotEmpty({ message: 'At least one City ID must be provided.' })
  cityIds: number[];

  @ToNumberArray()
  @IsOptional()
  @IsArray({ message: 'Projects must be an array of IDs.' })
  @IsInt({ each: true, message: 'Each project ID must be a positive integer.' })
  @IsPositive({
    each: true,
    message: 'Each project ID must be greater than zero.',
  })
  projectIds: number[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value !== undefined ? value === 'true' || value === true : false,
  )
  isExcel: boolean;
}
