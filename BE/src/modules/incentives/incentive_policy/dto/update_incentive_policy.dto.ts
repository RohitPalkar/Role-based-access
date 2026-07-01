import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  Min,
  Max,
  Length,
  ArrayNotEmpty,
  IsOptional,
  IsNotEmpty,
  IsInt,
  IsDate,
  ValidateIf,
  ArrayMinSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsStartDateBeforeEndDate } from 'src/validations/common-validator/startDateAndEndDate.validation';

export class UpdateIncentiveSlabDto {
  @IsOptional()
  @IsNumber({}, { message: 'ID must be a number.' })
  id?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf(
    (o) => o?.launchStartRange !== undefined && o?.launchStartRange !== '',
  )
  @Min(0, { message: 'Launch Start Range cannot be negative.' })
  @IsNumber(
    { maxDecimalPlaces: 7 },
    { message: 'Launch Start Range can have up to 7 decimal places only.' },
  )
  launchStartRange?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf(
    (o) => o?.launchEndRange !== undefined && o?.launchEndRange !== '',
  )
  @Min(0, { message: 'Launch End Range cannot be negative.' })
  @IsNumber(
    { maxDecimalPlaces: 7 },
    { message: 'Launch End Range can have up to 7 decimal places only.' },
  )
  launchEndRange?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf(
    (o) =>
      o?.sustenanceStartRange !== undefined && o?.sustenanceStartRange !== '',
  )
  @Min(0, { message: 'Sustenance Start Range cannot be negative.' })
  @IsNumber(
    { maxDecimalPlaces: 7 },
    { message: 'Sustenance Start Range can have up to 7 decimal places only.' },
  )
  sustenanceStartRange?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf(
    (o) => o?.sustenanceEndRange !== undefined && o?.sustenanceEndRange !== '',
  )
  @Min(0, { message: 'Sustenance End Range cannot be negative.' })
  @IsNumber(
    { maxDecimalPlaces: 7 },
    { message: 'Sustenance End Range can have up to 7 decimal places only.' },
  )
  sustenanceEndRange?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf(
    (o) =>
      o?.launchIncentivePercentage !== undefined &&
      o?.launchIncentivePercentage !== '',
  )
  @IsNumber(
    {},
    { message: 'Launch Incentive Percentage must be a valid number.' },
  )
  @Min(0, { message: 'Launch Incentive Percentage cannot be negative.' })
  @Max(100, { message: 'Launch Incentive Percentage cannot be more than 100.' })
  launchIncentivePercentage?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf(
    (o) =>
      o?.sustenanceIncentivePercentage !== undefined &&
      o?.sustenanceIncentivePercentage !== '',
  )
  @IsNumber(
    {},
    { message: 'Sustenance Incentive Percentage must be a valid number.' },
  )
  @Min(0, { message: 'Sustenance Incentive Percentage cannot be negative.' })
  @Max(100, {
    message: 'Sustenance Incentive Percentage cannot be more than 100.',
  })
  sustenanceIncentivePercentage?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsNumber({}, { message: 'Launch minimum Bookings must be a numeric value.' })
  @Min(0, { message: 'Launch minimum Bookings must be at least 0.' })
  @Max(999, {
    message: 'Launch minimum Bookings must be a valid number up to 999.',
  })
  launchMinBookings?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsNumber(
    {},
    { message: 'Sustenance minimum Bookings must be a numeric value.' },
  )
  @Min(0, { message: 'Sustenance minimum Bookings must be at least 0.' })
  @Max(999, {
    message: 'Sustenance minimum Bookings must be a valid number up to 999.',
  })
  sustenanceMinBookings?: number;
}

// Main DTO for updating an incentive structure

export class UpdateIncentivePolicyDto {
  @IsOptional()
  @IsString({ message: 'Name must be a valid string.' })
  @Length(3, 255, { message: 'Name must be between 3 and 255 characters.' })
  name?: string;

  @IsOptional()
  @IsArray({ message: 'Projects must be an array of project IDs.' })
  @IsNumber({}, { each: true, message: 'Each project ID must be a number.' })
  @IsPositive({
    each: true,
    message: 'Each project ID must be a positive number.',
  })
  projects?: number[];

  @IsOptional()
  @IsArray({ message: 'City IDs must be an array of IDs.' })
  @IsInt({ each: true, message: 'Each City ID must be a positive integer.' })
  @ArrayNotEmpty({ message: 'At least one City ID must be provided.' })
  cities?: number[];

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

  @IsArray({ message: 'Region IDs must be an array.' })
  @ArrayNotEmpty({ message: 'Region IDs is required.' })
  @ArrayMinSize(1, { message: 'At least one Region ID must be provided.' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Each Region ID must be an integer.' })
  @IsPositive({
    each: true,
    message: 'Each Region ID must be greater than zero.',
  })
  regionIds: number[];

  @IsInt({ message: 'Group ID must be a positive integer.' })
  @IsPositive({ message: 'Group ID must be greater than zero.' })
  @IsNotEmpty({ message: 'Group ID is required.' })
  groupId?: number;

  @IsOptional()
  @IsDate({ message: 'Start Date must be a valid date.' })
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate({ message: 'End Date must be a valid date.' })
  @Type(() => Date)
  @IsStartDateBeforeEndDate({
    message: 'Start Date must be before End Date.',
  })
  endDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsNumber({}, { message: 'Max Payable Incentive must be a numeric value.' })
  @IsPositive({ message: 'Max Payable Incentive must be at least 0.' })
  @IsOptional()
  maxPayableIncentive?: number;

  @IsOptional()
  @IsArray({ message: 'Incentive Slabs must be an array.' })
  @ValidateNested({ each: true })
  @ArrayNotEmpty({ message: 'At least one slab must be provided.' })
  @Type(() => UpdateIncentiveSlabDto)
  incentiveSlabs?: UpdateIncentiveSlabDto[];
}
