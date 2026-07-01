import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from 'src/logger/logger';

@Injectable()
export class ResponseCatchMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      // DO NOT log req.body or res.body by default to prevent PII leaks
      // and massive event-loop blocking from JSON.stringify.
      if (
        !originalUrl.includes('booking-preview/') &&
        !originalUrl.includes('referrer-preview/') &&
        !originalUrl.includes('voucher-preview/')
      ) {
        logger.info(
          `HTTP ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          {
            context: 'HTTP',
            method,
            url: originalUrl,
            statusCode,
            durationMs: duration,
            ip,
          },
        );
      }
    });

    next();
  }
}
