import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/config/constants';
import { SlotStatusEnum } from 'src/enums/batch-manager.enums';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class ListSlotsDto {
  @IsNotEmptyTrimmed()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;
}

export class SlotDropdownDto {
  @IsOptional()
  @IsUUID()
  excludeSlotId?: string;
}

export class UpdateSlotStatusDto {
  @IsEnum(SlotStatusEnum)
  status: SlotStatusEnum;
}

export class MoveVoucherToSlotDto {
  @IsUUID()
  @IsNotEmpty()
  targetSlotId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Comments must not exceeds 500 characters.',
  })
  comments: string;
}
