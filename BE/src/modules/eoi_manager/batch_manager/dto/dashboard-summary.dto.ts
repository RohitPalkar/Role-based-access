import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { BatchStage } from 'src/enums/batch-manager.enums';
import { ResidentStatus } from 'src/enums/resident-status.enum';

export class DashboardSummaryDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  campaignId: number;

  @IsNotEmpty()
  @IsEnum(BatchStage)
  stage: BatchStage;

  @IsOptional()
  @IsEnum(ResidentStatus, {
    message: 'residentStatus must be either Indian or NRI',
  })
  residentStatus?: ResidentStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
