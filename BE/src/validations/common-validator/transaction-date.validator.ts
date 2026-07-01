import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as moment from 'moment';
import { DATE_FORMAT } from 'src/config/constants';

@ValidatorConstraint({ async: false })
export class IsNotOlderThan90DaysConstraint implements ValidatorConstraintInterface {
  validate(transactionDate: string) {
    const today = moment(); // Current date
    const transactionDateMoment = moment(transactionDate, DATE_FORMAT, true); // Parse transaction date

    if (!transactionDateMoment.isValid()) {
      return false; // Invalid date format
    }

    const diffInDays = today.diff(transactionDateMoment, 'days');
    return diffInDays <= 90; // Returns true if it's not older than 90 days
  }

  defaultMessage() {
    return 'Transaction date cannot be older than 90 days.';
  }
}

export function IsNotOlderThan90Days(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotOlderThan90DaysConstraint,
    });
  };
}
