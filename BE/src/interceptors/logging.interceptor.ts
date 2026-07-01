import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { logger } from '../logger/logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const method = request.method;
    const url = request.originalUrl || request.url;

    // Attempt to extract user identity if populated by auth guards
    const user = (request as any).user;
    const userEmail = user?.email || 'Anonymous';
    const userId = user?.dbId || user?.id || 'N/A';

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const durationMs = Date.now() - now;

        // Structured log for aggregators
        logger.info(`[HTTP] ${method} ${url} ${statusCode} - ${durationMs}ms`, {
          type: 'HTTP_ACCESS',
          method,
          url,
          statusCode,
          durationMs,
          userEmail,
          userId,
        });
      }),
    );
  }
}
