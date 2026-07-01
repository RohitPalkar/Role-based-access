import { ValidationOptions, registerDecorator } from 'class-validator';
const DISALLOWED_DOMAINS = ['gmail', 'yahoo', 'hotmail'];
export function isEmailDomainAllowed(
  validationOptions?: ValidationOptions,
  message?: string,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEmailDomainAllowed',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(email: any) {
          if (!email) return true;

          const domain = (email as string)
            .split('@')[1]
            ?.toLowerCase()
            .split('.')[0];

          // Check if the domain is in the disallowed list
          return domain && !DISALLOWED_DOMAINS.includes(domain);
        },
        defaultMessage() {
          return (
            message ??
            'Oops! That looks like a personal email address. Please enter your work email address to continue.'
          );
        },
      },
    });
  };
}
