import * as Sentry from '@sentry/node';
import { logger } from 'src/logger/logger';

export enum SecurityEventType {
  BRUTE_FORCE_THROTTLE = 'brute_force_throttle',
  BRUTE_FORCE_OTP_GUESS = 'brute_force_otp_guess',
}

/**
 * Centralized utility to log security events and send them to Sentry.
 * This allows for easy tracking and alerting on suspicious activity.
 */
export const logSecurityEvent = (
  eventType: SecurityEventType,
  message: string,
  context: Record<string, any> = {},
) => {
  // Log to standard logger for file/console tracking
  logger.error(`[SECURITY_ALERT] ${message}`, { eventType, ...context });

  // Send an explicit message to Sentry with security tags
  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    scope.setTag('type', 'security');
    scope.setTag('event', eventType);

    // Attach additional context to the Sentry event
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    Sentry.captureMessage(`[SECURITY_ALERT] ${message}`);
  });
};
