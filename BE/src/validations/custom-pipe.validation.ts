import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        // Recursive function to extract messages from nested errors
        const extractErrors = (
          validationErrors: ValidationError[],
          parent = '',
        ) => {
          const errorMessages = [];

          for (const error of validationErrors) {
            const propertyPath = parent
              ? `${parent}.${error.property}`
              : error.property;

            if (error.constraints) {
              errorMessages.push(
                `${Object.values(error.constraints).join(', ')}`,
              );
            }

            if (error?.children?.length) {
              errorMessages.push(
                ...extractErrors(error.children, propertyPath),
              );
            }
          }
          return errorMessages;
        };

        const simplifiedErrors = extractErrors(errors);
        return new BadRequestException(simplifiedErrors);
      },
    });
  }
}
