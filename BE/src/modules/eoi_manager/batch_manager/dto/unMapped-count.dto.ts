import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BatchStage } from 'src/enums/batch-manager.enums';

export class GetUnmappedCountDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  campaignId: number;

  @IsNotEmpty()
  @IsEnum(BatchStage)
  stage: BatchStage;

  @IsNotEmpty()
  @IsString()
  residentialStatus: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  preferenceIds: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  typology?: string[];
}
