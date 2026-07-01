import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/nestjs';
import { logger } from 'src/logger/logger';

export function sentryResponseContext(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.on('finish', () => {
    try {
      Sentry.setContext('response', {
        status_code: res.statusCode,
        url: req.originalUrl,
        method: req.method,
      });
    } catch (error) {
      logger.error('Error setting Sentry response context:', error);
    } finally {
      Sentry.setContext('response', null);
    }
  });

  next();
}
