import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import NodeEnv from 'src/enums/node-env.enum';
import { logger } from 'src/logger/logger';
import { sendProdAlertEmail } from 'src/infra/ses-alert-sender';
import { removeCircularReferences } from 'src/utils/safe-serialize';

interface NormalizedException {
  status: number;
  message: string | string[];
  errors: any;
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      logger.error('Non-HTTP Context Error', exception);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errors, stack } =
      this.normalizeException(exception);

    logger.error({
      message,
      status,
      path: request.url,
      method: request.method,
    });

    this.reportToSentry(exception, request, status);

    try {
      await this.sendCriticalAlert(status, request, message, exception);
    } catch (err) {
      logger.error('Failed to send prod alert email', err);
    }

    if (response.headersSent) {
      logger.error('Headers already sent, cannot send error response', {
        url: request.url,
        method: request.method,
      });
      return;
    }

    const sanitizedErrors = removeCircularReferences(errors || {});

    const errorResponse: Record<string, any> = {
      success: false,
      response: null,
      errors: {
        statusCode: status,
        path: request.url,
        ...sanitizedErrors,
        message: sanitizedErrors?.message || message,
      },
    };

    if (this.configService.get<string>('NODE_ENV') !== NodeEnv.PROD && stack) {
      errorResponse.errors.stack = stack;
    }

    response.status(status).json(errorResponse);
  }

  private normalizeException(exception: unknown): NormalizedException {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: any = null;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errors = { message };
      } else if (Array.isArray((res as any)?.message)) {
        message = (res as any).message;
        errors = res;
      } else if (res && typeof res === 'object') {
        message = (res as any).message || exception.message;
        errors = res;
      } else {
        message = exception.message;
        errors = { message };
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
      errors = { message };
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'errors' in exception
    ) {
      errors = (exception as any).errors;
    } else {
      errors = { message: 'Unexpected error' };
    }

    if (
      typeof exception === 'object' &&
      exception !== null &&
      typeof (exception as any).statusCode === 'number'
    ) {
      status = (exception as any).statusCode;
    }

    return { status, message, errors, stack };
  }

  private reportToSentry(exception: unknown, request: Request, status: number) {
    const level: 'error' | 'warning' = status >= 500 ? 'error' : 'warning';

    const safeHeaders = { ...request.headers } as Record<string, any>;
    ['authorization', 'cookie', 'x-api-key', 'x-amz-security-token'].forEach(
      (header) => {
        if (safeHeaders[header]) {
          safeHeaders[header] = '[REDACTED]';
        }
      },
    );

    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setExtras({
        path: request.url,
        method: request.method,
        query: request.query,
      });
      scope.setContext('request', {
        headers: safeHeaders,
        body: this.getSafeRequestBody(request.body),
      });

      const reqUser = (request as any).user;
      if (reqUser) {
        scope.setUser({
          id: reqUser.dbId || reqUser.id,
          email: reqUser.email,
          username: reqUser.name,
        });
      }

      Sentry.captureException(exception);
    });
  }

  private getSafeRequestBody(body: unknown): unknown {
    if (body == null) {
      return undefined;
    }
    if (typeof body === 'string') {
      return body.length > 1000 ? '[REDACTED]' : body;
    }
    return '[REDACTED]';
  }

  private async sendCriticalAlert(
    status: number,
    request: Request,
    message: string | string[],
    exception: unknown,
  ) {
    if (
      status < 500 ||
      this.configService.get<string>('NODE_ENV') !== NodeEnv.PROD
    )
      return;

    await sendProdAlertEmail(
      `PURAVANKARA PROD CRITICAL ERROR ${status}`,
      `URL: ${request.originalUrl}
METHOD: ${request.method}
MESSAGE: ${message}
STACK: ${(exception as Error)?.stack}`,
    );
  }
}
