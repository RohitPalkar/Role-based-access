import {
  IsString,
  IsDate,
  IsArray,
  IsInt,
  ValidateNested,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsPositive,
  ArrayNotEmpty,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsStartDateBeforeEndDate } from '../../../../validations/common-validator/startDateAndEndDate.validation';
import { IsValidPrizeValue } from '../../../../validations/common-validator/prize-value.validation.validator';

export enum PrizeType {
  PERKS = 'Perks',
  PERCENTAGE = 'Percentage',
  CASH_PRIZE = 'Cash Prize',
}

class CreateIncentiveSlabDto {
  @IsNumber(
    { maxDecimalPlaces: 7 },
    { message: 'Start range can have up to 7 decimal places only.' },
  )
  @Min(0, { message: 'Start range must be a positive number.' })
  startRange: number;

  @IsNumber(
    { maxDecimalPlaces: 7 },
    { message: 'End range can have up to 7 decimal places only.' },
  )
  @Min(0, { message: 'End range must be a positive number.' })
  endRange: number;

  @IsEnum(PrizeType, { message: 'Invalid Reward type selected.' })
  @IsNotEmpty({ message: 'Reward type is required.' })
  rewardType: PrizeType;

  @IsValidPrizeValue()
  rewardValue: any;
}

export class CreateBoosterDto {
  @IsString()
  @IsNotEmpty({ message: 'Booster name is required.' })
  @MinLength(3, { message: 'Booster name must be at least 3 characters long.' })
  @MaxLength(50, { message: 'Booster name cannot exceed 50 characters.' })
  name: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsStartDateBeforeEndDate({ message: 'Start date must be before end date.' })
  endDate: Date;

  @IsInt({ message: 'Group ID must be a positive integer.' })
  @IsPositive({ message: 'Group ID must be greater than zero.' })
  @IsNotEmpty({ message: 'Group ID is required.' })
  groupId?: number;

  @IsArray({ message: 'Brand ID must be an array.' })
  @ArrayNotEmpty({ message: 'Brand ID is required.' })
  @ArrayMinSize(1, { message: 'At least one Brand ID must be provided.' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Each Brand ID must be an integer.' })
  @IsPositive({
    each: true,
    message: 'Each Brand ID must be greater than zero.',
  })
  brandId: number[];

  @IsArray({ message: 'City IDs must be an array of IDs.' })
  @IsInt({ each: true, message: 'Each City ID must be a positive integer.' })
  @ArrayNotEmpty({ message: 'At least one City ID must be provided.' })
  cityIds: number[];

  @IsArray({ message: 'Projects must be an array of IDs.' })
  @IsInt({ each: true, message: 'Each project ID must be a positive integer.' })
  @IsPositive({
    each: true,
    message: 'Each project ID must be greater than zero.',
  })
  projects: number[];

  @IsArray({ message: 'Booster Slabs must be an array.' })
  @ValidateNested({ each: true })
  @ArrayNotEmpty({ message: 'At least one slab must be provided.' })
  @Type(() => CreateIncentiveSlabDto)
  boosterSlabs?: CreateIncentiveSlabDto[];
}

export type ProjectValidationMessages = {
  notFound: (missing: number[]) => string;
  cityMismatch: (invalid: number[], provided: (number | string)[]) => string;
};
