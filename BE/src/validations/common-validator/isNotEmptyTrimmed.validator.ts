import { ValidationOptions, registerDecorator } from 'class-validator';

export function IsNotEmptyTrimmed(
  validationOptions?: ValidationOptions,
  message?: string,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotEmptyTrimmed',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return String(value).trim().length > 0;
        },
        defaultMessage() {
          return message ?? '$property must not be empty.';
        },
      },
    });
  };
}
