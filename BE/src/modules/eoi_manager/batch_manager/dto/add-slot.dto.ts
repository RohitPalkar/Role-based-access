import { Type } from 'class-transformer';
import { IsInt, IsString, IsUUID, Matches, Min } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class AddBatchSlotsDto {
  @IsNotEmptyTrimmed()
  @IsUUID()
  batchId?: string;

  @IsNotEmptyTrimmed()
  @IsString()
  date: string;

  @IsNotEmptyTrimmed()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  numberOfSlots: number;

  @IsNotEmptyTrimmed()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  slotDuration: number;

  @IsNotEmptyTrimmed()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacityPerSlot: number;
}

export class UpdateBatchSlotDto {
  @IsNotEmptyTrimmed()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;

  @IsNotEmptyTrimmed()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity: number;
}
