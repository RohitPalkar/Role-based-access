import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { BatchStage } from 'src/enums/batch-manager.enums';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class ListGreBatchesDto extends CommonFindAllQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  campaignId?: number;

  @IsOptional()
  @IsString()
  stage?: BatchStage;
}

export class ListGreSlotsDto extends CommonFindAllQueryDto {
  @IsNotEmptyTrimmed()
  @IsUUID()
  batchId: string;
}

export class ListViewRecordsDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsUUID()
  slotId?: string;
}

export class ReceptionOtpDto {
  @IsNotEmpty()
  @IsUUID()
  batchVoucherId: string;
}

export class ReceptionCheckInDto {
  @IsNotEmpty()
  @IsUUID()
  batchVoucherId: string;

  @IsNotEmpty()
  @IsString()
  otp: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  headCount: number;
}
