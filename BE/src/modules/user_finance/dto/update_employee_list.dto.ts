import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsDate,
  MinDate,
  Min,
} from 'class-validator';
import { startOfDay } from 'date-fns';
import { Action } from 'src/enums/user_finance.enums';

export class UpdateUserFinanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Salary must be a positive number.' })
  salary: number;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number.' })
  amount: number;

  @IsOptional()
  @IsDate({ message: 'Start Date must be a valid date.' })
  @Type(() => Date)
  @MinDate(
    () => {
      const today = startOfDay(new Date());
      return today;
    },
    { message: 'Date cannot be in the past.' },
  )
  date: Date;

  @IsOptional()
  @IsEnum([Action.RETAIN, Action.WRITE_OFF], {
    message:
      'action must be one of the following values: either "retain" or "write_off',
  })
  action: Action.RETAIN | Action.WRITE_OFF;
}
