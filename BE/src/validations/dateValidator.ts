import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as moment from 'moment';
@ValidatorConstraint({ name: 'IsNotFutureDate', async: false })
export class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (!value) return true;

    const inputDate = moment(value);
    const sixMonthsAgo = moment().subtract(6, 'months').startOf('day');
    const today = moment().endOf('day');

    return inputDate.isBetween(sixMonthsAgo, today, undefined, '[]'); // inclusive
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be within the last 6 months (not in future or too far past)`;
  }
}
