import { IsDate, IsInt, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { endOfDay, isValid, parseISO } from 'date-fns';

export class DailyTrackerQueryDto {
  @Type(() => Number)
  @IsInt()
  campaignId: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;

    const d = typeof value === 'string' ? parseISO(value) : value;
    return isValid(d) ? d : undefined;
  })
  @IsDate()
  startDate?: Date; // 'YYYY-MM-DD'

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => {
    if (!value) return value;
    const d = typeof value === 'string' ? parseISO(value) : value;
    if (!isValid(d)) return undefined;
    return endOfDay(d);
  })
  endDate?: Date; // 'YYYY-MM-DD'
}
