import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as jwt from 'jsonwebtoken'; // Make sure to install the jsonwebtoken package
import * as fs from 'fs';
import { JWT_ALGORITHM } from 'src/config/constants';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly publicKey: string;
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.publicKey = fs.readFileSync('keys/private_key.pem', 'utf8');
  }

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const statusCode = res.statusCode;
      const responseTime = Date.now() - start;
      const origin = req.headers.origin || 'unknown origin';

      const token = req.headers.authorization?.split(' ')[1];
      let role: string | undefined;
      let requesterUser: string | undefined;
      if (token) {
        try {
          const decodedToken: any = jwt.verify(token, this.publicKey, {
            algorithms: [JWT_ALGORITHM],
            ignoreExpiration: true, // Ignore expiration check
          });
          requesterUser = decodedToken?.sub;
          role = decodedToken?.roles;
        } catch (error) {
          this.logger.warn('Invalid JWT token', error);
        }
      }
      const clientIp =
        (req.headers['x-forwarded-for'] as string) || req.ip || 'N/A';

      const logDetails = {
        method: req.method,
        url: req.url,
        statusCode,
        origin,
        requesterUser,
        role,
        userAgent: req.headers['user-agent'] || 'N/A', // Include User-Agent
        clientIp,
        requestPayload: req.body,
        responsePayload: res.locals.data,
        responseTime: `${responseTime}ms`,
      };

      this.logger.info(logDetails);
    });
    next();
  }
}
