import * as winston from 'winston';
import fastRedact = require('fast-redact');

const SENSITIVE_KEYS = [
  'password',
  'otp',
  'token',
  'authorization',
  'cookie',
  'payment',
  'secret',
  'aadhaar',
  'pan',
  'accountNumber',
  'reqBody',
  'body', // We'll still redact body fields if they slip through
];

const redact = fastRedact({
  paths: SENSITIVE_KEYS.flatMap((k) => [k, `*.*.${k}`, `*.${k}`]),
  censor: '[REDACTED]',
  serialize: false,
});

export const redactionFormat = winston.format((info) => {
  return redact(info) as winston.Logform.TransformableInfo;
});
