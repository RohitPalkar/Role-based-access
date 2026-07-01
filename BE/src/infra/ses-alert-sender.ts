import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from 'src/logger/logger';
import { decryptEnv } from 'src/utils/encryption-decryption.util';

const sesClient = new SESClient({
  credentials: {
    accessKeyId: decryptEnv(process.env.AWS_SES_ACCESS_KEY_ID),
    secretAccessKey: decryptEnv(process.env.AWS_SES_SECRET_ACCESS_KEY),
  },
  region: process.env.AWS_S3_REGION,
});

let lastAlertAt = 0;

export async function sendProdAlertEmail(subject: string, body: string) {
  const dl = process.env.ALERT_DL;
  if (!dl) {
    logger.error('ALERT_DL not configured');
    return;
  }

  const now = Date.now();
  if (now - lastAlertAt < 120000) return;
  lastAlertAt = now;

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: process.env.AWS_SES_FROM_EMAIL,
        Destination: {
          ToAddresses: dl.split(','),
        },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: body, Charset: 'UTF-8' } },
        },
      }),
    );
  } catch (err) {
    logger.error('Failed to send PROD alert email', err);
  }
}
