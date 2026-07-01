import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { logger } from 'src/logger/logger';
import { logSecurityEvent, SecurityEventType } from 'src/utils/security-logger';

/**
 * Custom throttle guard for OTP endpoints.
 * Limits OTP requests per (IP, mobile/email) tuple with per-route limits.
 *
 * Usage:
 *   @UseGuards(OtpThrottleGuard('send-otp')) // 5 requests per 60s
 *   @UseGuards(OtpThrottleGuard('verify-otp')) // 10 requests per 60s
 */
@Injectable()
export class OtpThrottleGuard implements CanActivate {
  private readonly routeLimits = {
    'send-otp': { limit: 5, ttl: 5 * 60 * 1000 }, // 5 per minute (combined resend + send)
    'verify-otp': { limit: 10, ttl: 10 * 60 * 1000 }, // 10 per minute
  };

  constructor(@Inject(CACHE_MANAGER) private readonly cacheService: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const route = this.extractRoute(request);

    if (!route) {
      logger.warn('OtpThrottleGuard: could not determine route');
      return true; // Fail open if we can't determine the route
    }

    const config = this.routeLimits[route];
    if (!config) {
      logger.warn(`OtpThrottleGuard: unknown route ${route}`);
      return true; // Fail open for unknown routes
    }

    const key = this.getIdentifier(request, route);
    if (!key) {
      throw new BadRequestException(
        'Missing required field (mobile or email) for OTP throttle',
      );
    }

    const cacheKey = `otp:throttle:${route}:${key}`;
    const currentCount = (await this.cacheService.get<number>(cacheKey)) ?? 0;

    if (currentCount >= config.limit) {
      logSecurityEvent(
        SecurityEventType.BRUTE_FORCE_THROTTLE,
        `OTP throttle exceeded for ${cacheKey}: ${currentCount}/${config.limit}`,
        { route, key, currentCount, limit: config.limit },
      );
      throw new HttpException(
        `Too many OTP requests. Please try again after ${Math.ceil(config.ttl / 1000)} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    await this.cacheService.set(cacheKey, currentCount + 1, config.ttl);
    return true;
  }

  /**
   * Extract the route name from the request path.
   * E.g., /sso/send-otp → send-otp, /site-visit/send-otp → send-otp
   */
  private extractRoute(req: Request): string | null {
    const path = req.path;
    if (path.includes('send-otp')) return 'send-otp';
    if (path.includes('verify-otp')) return 'verify-otp';
    return null;
  }

  /**
   * Get the identifier for throttling: (ip:mobile) or (ip:email)
   * Extracts from request body preferentially.
   */
  private getIdentifier(req: Request, route: string): string | null {
    logger.info(`OtpThrottleGuard: extracting identifier for route ${route}`);

    const ip = this.getClientIp(req);
    const body = req.body || {};

    // For OTP routes, extract mobile or email from body
    if (body.mobile) {
      return `${ip}:${body.mobile}`;
    }

    if (body.email) {
      return `${ip}:${body.email.toLowerCase()}`;
    }

    // Special handling for site-visit routes which may nest under projectInterested
    if (body.projectInterested && body.mobile) {
      return `${ip}:${body.mobile}`;
    }

    return null;
  }

  /**
   * Extract client IP from request, handling proxies.
   */
  private getClientIp(req: Request): string {
    return req.ip || (req.socket?.remoteAddress as string) || 'unknown';
  }
}
