import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from '../infra/request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly uuidRegex = /^[a-zA-Z0-9-]{1,50}$/;

  use(req: Request, res: Response, next: NextFunction) {
    let traceId =
      req.headers['x-request-id'] || req.headers['x-datadog-trace-id'];

    if (Array.isArray(traceId)) {
      traceId = traceId[0];
    }

    if (
      !traceId ||
      typeof traceId !== 'string' ||
      !this.uuidRegex.test(traceId)
    ) {
      traceId = randomUUID();
    }

    // Attach to response headers so client gets the trace ID back
    res.setHeader('x-request-id', traceId);

    const context = {
      requestId: traceId,
      type: 'HTTP' as const,
      name: req.originalUrl || req.url,
    };

    requestContext.run(context, () => {
      next();
    });
  }
}
