import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom Validator to ensure startDate < endDate
 */
export function IsStartDateBeforeEndDate(
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsStartDateBeforeEndDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const object = args.object as any;
          object.startDate = object.startDate ?? object.launchStartDate;
          object.endDate = object.endDate ?? object.launchEndDate;
          if (!object.startDate || !object.endDate) {
            return false; // If either date is missing, validation fails
          }
          return object.startDate < object.endDate; // Ensures startDate < endDate
        },
        defaultMessage() {
          return 'Start date must be before end date.';
        },
      },
    });
  };
}
