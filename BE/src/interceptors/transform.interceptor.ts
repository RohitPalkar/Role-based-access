import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Observable, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { get, isObject, omit } from 'lodash';
import { EXPOSE_FIELDS_METADATA_KEY } from './decorators/expose-fields-from-response.decorator';
import { SKIP_ENCRYPTION_KEY } from './decorators/skip-encryption.decorator';
import { encryptResponse } from 'src/utils/encryption-decryption.util';

interface StandardSuccess<T> {
  success: true;
  response: {
    statusCode: number;
    message: string;
    data?: T;
  };
  errors: null;
}

interface StandardError {
  success: false;
  response: null;
  statusCode: number;
  errors?: {
    message: string;
    details?: any;
  };
  stack?: string;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Check if the route should skip the interceptor
    const skipInterceptor = this.reflector.get<boolean>(
      'skipResponseInterceptor',
      context.getHandler(),
    );

    // Check if the route wants to expose specific fields
    const exposeFields =
      this.reflector.get<string[]>(
        EXPOSE_FIELDS_METADATA_KEY,
        context.getHandler(),
      ) || [];

    if (skipInterceptor) {
      return next.handle();
    }

    // Check metadata at handler and controller level
    const skipEncryption =
      this.reflector.getAllAndOverride<boolean>(SKIP_ENCRYPTION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    const pipeline = next.handle().pipe(
      mergeMap(async (res: unknown) => {
        return this.responseHandler(res, context, exposeFields, skipEncryption);
      }),
    );

    if (process.env.DELEGATE_ERRORS_TO_FILTER === 'true') {
      return pipeline;
    }

    return pipeline.pipe(
      catchError((err: HttpException) =>
        throwError(() => this.errorHandler(err, context)),
      ),
    );
  }

  private errorHandler(
    exception: HttpException,
    context: ExecutionContext,
  ): StandardError {
    const ctx = context?.switchToHttp();
    const response = ctx?.getResponse();

    let status =
      exception instanceof HttpException
        ? exception?.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorException: any = exception;

    if (exception?.getResponse) {
      const exceptionResponse = exception?.getResponse();

      // If it's an object (e.g., { message: 'Something went wrong' })
      // or an array, transform it accordingly
      if (isObject(exceptionResponse) && !Array.isArray(exceptionResponse)) {
        errorException = exceptionResponse;
      }
      if (Array.isArray(exceptionResponse)) {
        errorException = get(exceptionResponse, '0', {});
      }
    }
    // Ensure status comes from error payload if available
    if (errorException?.status) {
      status = errorException.status;
    }
    response.status(status);
    return {
      success: false,
      response: null,
      statusCode: status,
      errors: {
        message:
          errorException?.message ||
          (exception instanceof Error ? exception.message : 'Unexpected error'),
        ...errorException, // preserve other fields if present
      },
    };
  }

  private async responseHandler(
    res: any,
    context: ExecutionContext,
    exposeFields: string[],
    skipEncryption: boolean,
  ) {
    const ctx = context.switchToHttp();
    const response = ctx?.getResponse();

    const statusCode = res?.statusCode ?? response?.statusCode;
    response?.status(statusCode);
    const successResponse: StandardSuccess<any> = {
      success: true,
      response: {
        statusCode: statusCode,
        message: res?.message,
        data: null,
      },
      errors: null,
    };
    const hasData =
      res?.data !== undefined &&
      res?.data !== null &&
      !(typeof res.data === 'object' && Object.keys(res.data).length === 0);

    if (hasData) {
      const sanitizedData = this.sanitizeResponse(res?.data, exposeFields);
      const shouldEncrypt =
        process.env.ENABLE_ENCRYPTION === 'true' && !skipEncryption;
      successResponse.response.data = shouldEncrypt
        ? await encryptResponse(JSON.stringify(sanitizedData))
        : sanitizedData;
    }
    return successResponse;
  }

  private sanitizeResponse(data: any, exposeFields: string[]): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeResponse(item, exposeFields));
    } else if (isObject(data)) {
      // By default, omit these fields unless explicitly exposed
      const defaultOmittedFields = [
        'createdAt',
        'updatedAt',
        'createdBy',
        'updatedBy',
        'deletedAt',
        'isDeleted',
      ];

      // Ensure we don't omit explicitly exposed fields
      const fieldsToOmit = defaultOmittedFields.filter(
        (field) => !exposeFields.includes(field),
      );

      const cleanedData = omit(data, fieldsToOmit);

      // Convert Date fields to ISO strings for proper JSON serialization
      for (const key in cleanedData) {
        if (cleanedData[key] instanceof Date) {
          cleanedData[key] = cleanedData[key].toISOString(); // Convert Date to string
        } else if (
          isObject(cleanedData[key]) ||
          Array.isArray(cleanedData[key])
        ) {
          cleanedData[key] = this.sanitizeResponse(
            cleanedData[key],
            exposeFields,
          );
        }
      }

      return cleanedData;
    }

    return data;
  }
}
