import * as pm2 from 'pm2';
import { sendProdAlertEmail } from './ses-alert-sender';
import { Logger } from '@nestjs/common';

export function wirePm2CrashAlerts() {
  pm2.connect((connectErr) => {
    if (connectErr) {
      Logger.error('PM2 connect failed', connectErr);
      return;
    }

    pm2.launchBus((busErr, bus) => {
      if (busErr) {
        Logger.error('PM2 bus launch failed', busErr);
        return;
      }

      bus.on('process:event', async (data: any) => {
        if (data.event === 'exit' || data.event === 'restart') {
          try {
            await sendProdAlertEmail(
              `PM2 ${data.event.toUpperCase()} - ${data.process.name}`,
              `
                APP: ${data.process.name}
                EVENT: ${data.event}
                EXIT CODE: ${data.process.exit_code}
                TIME: ${new Date().toISOString()}
              `.trim(),
            );
          } catch (err) {
            Logger.error('Failed to send PM2 DL alert', err);
          }
        }
      });
    });
  });
}
