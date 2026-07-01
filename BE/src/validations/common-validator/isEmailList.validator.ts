// src/validations/custom/isEmailList.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { EMAIL_REGEX } from 'src/config/constants';

export function IsEmailList(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEmailList',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          const emails = value.split(',').map((e) => e.trim());
          return emails.every((email) => EMAIL_REGEX.test(email));
        },
        defaultMessage(args: ValidationArguments) {
          return `Each email in '${args.property}' must be a valid email address.`;
        },
      },
    });
  };
}
