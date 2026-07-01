import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Injectable, HttpException, Inject } from '@nestjs/common';
import { CustomConfigService } from 'src/config/custom-config.service';
import { logger } from 'src/logger/logger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class SentryService {
  constructor(
    private readonly configService: CustomConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {
    this.init();
  }

  private init() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    if (!dsn) {
      logger.warn('Sentry DSN missing. Sentry disabled.');
      return;
    }

    const monthlyLimit =
      this.configService.get<number>('SENTRY_MONTHLY_LIMIT') || 10000;

    Sentry.init({
      dsn,
      environment: this.configService.get<string>('NODE_ENV') || 'dev',

      // Cost control
      sampleRate: 0.5, // 50% errors
      tracesSampleRate: 0.4, // 40% transactions
      profilesSampleRate: 0.2, // 20% profiles

      integrations: [nodeProfilingIntegration()],

      beforeSend: async (event, hint) => {
        const exception = hint?.originalException;

        // Drop expected HTTP errors
        if (exception instanceof HttpException) {
          const status = exception.getStatus();
          if (status < 500) {
            return null;
          }
        }

        try {
          const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
          const cacheKey = `sentry_limit:${currentMonth}`;
          const count = (await this.cacheService.get<number>(cacheKey)) || 0;

          if (count >= monthlyLimit) {
            logger.warn(
              `Sentry monthly rate limit reached (${monthlyLimit}). Dropping event.`,
            );
            return null;
          }

          // Increment count (ttl is 31 days in ms)
          await this.cacheService.set(
            cacheKey,
            count + 1,
            31 * 24 * 60 * 60 * 1000,
          );
        } catch (error) {
          logger.error('Error checking Sentry rate limit', error);
          // Fail open to still capture error if Redis is unreachable
        }

        return event;
      },
    });

    logger.info(
      `Sentry initialized (prod-grade) with limit: ${monthlyLimit}/month`,
    );
  }
}
