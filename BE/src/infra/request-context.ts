import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  readonly requestId: string;
  readonly type: 'HTTP' | 'CRON' | 'BULLMQ' | 'OUTBOUND';
  readonly name?: string;
  readonly userId?: number;
  readonly jobId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getRequestContext = (): RequestContext | undefined => {
  return requestContext.getStore();
};
