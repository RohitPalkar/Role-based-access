import { IsBoolean, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { IsStartDateBeforeEndDate } from 'src/validations/common-validator/startDateAndEndDate.validation';

export class UpdateProjectPhaseDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sustenanceDate?: Date;

  @IsBoolean()
  skipLaunch?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  launchStartDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @IsStartDateBeforeEndDate({ message: 'Start date must be before end date.' })
  launchEndDate?: Date;
}
