import * as winston from 'winston';
import { getRequestContext } from '../infra/request-context';

export const injectContextFormat = winston.format((info) => {
  const ctx = getRequestContext();
  if (ctx) {
    Object.assign(info, {
      requestId: ctx.requestId,
      contextType: ctx.type,
      contextName: ctx.name,
      jobId: ctx.jobId,
      userId: ctx.userId,
    });
  }
  return info;
});
