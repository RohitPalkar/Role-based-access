import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';
import { redactionFormat } from './redact.format';
import { injectContextFormat } from './als.format';

const createLogFolder = () => {
  const dateFolder = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const logDir = path.join('../../efs/logs', dateFolder); // Folder name based on current date
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
};

const logDir = createLogFolder();

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  injectContextFormat(),
  redactionFormat(),
  winston.format.json(),
);

const successTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'combined.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxFiles: '30d',
  level: 'info',
});

const errorTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'error.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxFiles: '30d',
  level: 'error',
});

export const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    successTransport,
    errorTransport,
    new winston.transports.Console(),
  ],
});
