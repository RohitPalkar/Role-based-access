import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';

const SENSITIVE_KEYS = [
  'password',
  'otp',
  'token',
  'authorization',
  'cookie',
  'payment',
  'secret',
];

export function sanitizePayload(
  payload?: Record<string, any> | null,
): Record<string, any> | undefined {
  if (!payload) return undefined;

  const sanitized = { ...payload };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (
      typeof sanitized[key] === 'string' &&
      sanitized[key].length > 1000
    ) {
      sanitized[key] = '[TRUNCATED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Shallow serialize to avoid excessive log volume from deep objects or ORM entities
      try {
        const stringified = JSON.stringify(sanitized[key]);
        sanitized[key] =
          stringified.length > 1000
            ? '[TRUNCATED_OBJECT]'
            : JSON.parse(stringified);
      } catch {
        sanitized[key] = '[COMPLEX_OBJECT]';
      }
    }
  }

  return sanitized;
}

export function logsAndErrorHandling(
  moduleName: string,
  errorResponse: any,
  payload?: Record<string, any> | null,
): never {
  const sanitizedPayload = sanitizePayload(payload);

  if (
    errorResponse?.code === 'ER_DUP_ENTRY' ||
    errorResponse?.message?.includes('Duplicate entry')
  ) {
    throw new BadRequestException(
      'Duplicate value detected. Please ensure that the data you are trying to save does not already exist.',
    );
  }

  if (errorResponse instanceof HttpException) {
    throw errorResponse;
  }

  const message =
    errorResponse?.response ||
    errorResponse?.message ||
    'An unexpected error occurred';

  if (errorResponse instanceof Error) {
    const internalError = new InternalServerErrorException(message);
    internalError.stack = errorResponse.stack;
    (internalError as any).cause = errorResponse;
    (internalError as any).moduleName = moduleName;
    (internalError as any).payload = sanitizedPayload;
    throw internalError;
  }

  const defaultError = new InternalServerErrorException(message);
  (defaultError as any).moduleName = moduleName;
  (defaultError as any).payload = sanitizedPayload;
  throw defaultError;
}
