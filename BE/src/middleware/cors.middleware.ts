import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import NodeEnv from 'src/enums/node-env.enum';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const excludedRoutes = this.configService.get<string[]>(
      'CORS_EXCLUDED_ROUTES',
      [],
    );
    if (
      excludedRoutes.includes(req.originalUrl) ||
      req.originalUrl.includes('-preview')
    ) {
      // Set CORS headers for this specific URL
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PATCH,POST,OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
      );
      res.header('Access-Control-Allow-Credentials', 'true');

      // Respond to preflight OPTIONS requests
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204); // No Content
      }
      return next();
    }

    // Apply default CORS behavior for other routes
    const allowedOrigins =
      JSON.parse(this.configService.get<string>('CORS_ALLOWED_DOMAIN_LIST')) ??
      [];

    const nodeEnv = this.configService.get<string>('NODE_ENV', NodeEnv.DEV);
    const origin = req.headers.origin;

    if (nodeEnv === NodeEnv.PROD) {
      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      } else {
        return res.status(403).send('Not allowed by CORS');
      }
    } else {
      res.header('Access-Control-Allow-Origin', '*'); // Allow all origins in non-production
    }

    res.header('Access-Control-Allow-Methods', 'GET,PATCH,POST,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept',
    );
    res.header('Access-Control-Allow-Credentials', 'true');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  }
}
