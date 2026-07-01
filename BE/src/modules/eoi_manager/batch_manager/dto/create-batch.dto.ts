import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BatchStage } from 'src/enums/batch-manager.enums';
import { BatchDayConfigDto } from './batch-days.dto';

export class CreateUpdateBatchDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  campaignId?: number;

  @IsNotEmpty()
  @IsString()
  name: string;

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

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchDayConfigDto)
  days: BatchDayConfigDto[];

  /** Slot duration in minutes */
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  slotDuration: number;

  /** Max vouchers per slot */
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacityPerSlot: number;

  /** Open batch before scheduled time (in minutes) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  openBatchBefore?: number;

  /** Expected users */
  // @IsNotEmpty()
  // @IsInt()
  // @Min(1)
  // @Type(() => Number)
  // totalUsers: number;
}
