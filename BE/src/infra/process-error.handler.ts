import * as Sentry from '@sentry/node';
import { logger } from '../logger/logger';
import { sendProdAlertEmail } from './ses-alert-sender';

function formatError(input: any): string {
  if (input instanceof Error) {
    return `
MESSAGE:
${input.message}

STACK:
${input.stack}
    `;
  }

  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

export function registerProcessErrorHandlers() {
  let fatalAlertSent = false;

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', reason);
    Sentry.captureException(reason);
    Sentry.flush(2000)
      .catch((err) =>
        logger.error('Sentry flush failed for unhandledRejection', err),
      )
      .finally(() => {
        sendProdAlertEmail(
          'PROD unhandledRejection',
          `
TIME: ${new Date().toISOString()}

${formatError(reason)}
          `,
        ).catch((err) => logger.error('Alert email failed', err));
      });
  });

  process.on('uncaughtException', (error) => {
    if (!fatalAlertSent) {
      fatalAlertSent = true;
      logger.error('Uncaught Exception', error);
      Sentry.captureException(error);
      Sentry.flush(2000)
        .catch((err) =>
          logger.error('Sentry flush failed for uncaughtException', err),
        )
        .finally(() => {
          sendProdAlertEmail(
            'PROD uncaughtException (PROCESS EXIT)',
            `TIME: ${new Date().toISOString()}
        ${formatError(error)}
      `,
          )
            .catch((err) => logger.error('Alert email failed', err))
            .finally(() => process.exit(1));
        });
    }
  });
}
