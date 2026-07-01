import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import NodeEnv from './enums/node-env.enum';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/transform.interceptor';
import { CustomValidationPipe } from './validations/custom-pipe.validation';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { PAYLOAD_SIZE_LIMIT } from './config/constants';
import { registerProcessErrorHandlers } from './infra/process-error.handler';

async function bootstrap() {
  registerProcessErrorHandlers();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  // Use port from ENV
  const port = configService.get<number>('PORT');

  let routePrefix = 'api';
  const nodeEnv = configService.get<string>('NODE_ENV');

  if (nodeEnv !== NodeEnv.PROD) {
    routePrefix += `/${nodeEnv}`;
  }
  const allowedOrigins =
    JSON.parse(configService.get<string>('CORS_ALLOWED_DOMAIN_LIST')) ?? [];
  // set global route prefix
  app.setGlobalPrefix(routePrefix);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: [
            "'self'",
            'data:',
            configService.get<any>('AWS_S3_ACCESS_URL'),
            configService.get<any>('PROJECT_IMAGES_URL'),
          ],
          scriptSrc: ["'self'"],
          // stynew ValidationPipe({ whitelist: true })leSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      frameguard: { action: 'sameorigin' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: { maxAge: 31536000, includeSubDomains: true },
    }),
  );
  app.use(compression());

  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      if (nodeEnv === NodeEnv.PROD) {
        // In production, restrict to allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS. Invalid Access.'));
        }
      } else {
        // In non-production, allow all origins
        callback(null, true);
      }
    },
    methods: 'GET,PATCH,POST,PUT,DELETE',
    credentials: true, // Enable credentials if needed
  });

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, stopAtFirstError: true }),
    new CustomValidationPipe(),
  );
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  // Set EJS as the template engine
  app.setViewEngine('ejs');

  // Set the directory for EJS templates
  const viewsPath =
    process.env.NODE_ENV === NodeEnv.PROD
      ? join(__dirname, '..', 'dist', 'templates') // Production: dist/views
      : join(__dirname, '..', 'src', 'templates');
  app.setBaseViewsDir(viewsPath);

  // Configure payload size limit
  app.use(
    express.json({
      limit: PAYLOAD_SIZE_LIMIT,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString(); // preserve raw body
      },
    }),
  );

  app.use(
    express.urlencoded({
      limit: PAYLOAD_SIZE_LIMIT,
      extended: true,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString(); // preserve raw body
      },
    }),
  );

  app.set('trust proxy', 1);
  await app.listen(port);
}
bootstrap();
