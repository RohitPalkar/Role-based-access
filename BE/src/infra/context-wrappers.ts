import { randomUUID } from 'crypto';
import { requestContext } from './request-context';

export function runWithJobContext<T>(
  type: 'CRON' | 'BULLMQ',
  name: string,
  fn: () => Promise<T> | T,
): Promise<T> | T {
  return requestContext.run(
    {
      requestId: randomUUID(),
      type,
      name,
      jobId: randomUUID(), // A fresh ID for tracking this background execution specifically
    },
    fn,
  );
}

export function CronContext(name: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return runWithJobContext('CRON', name, () =>
        originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}

export function JobContext(name: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return runWithJobContext('BULLMQ', name, () =>
        originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}

/**
 * Appends the current active `requestId` to outbound HTTP request headers.
 */
export function injectTraceHeader(
  headers: Record<string, string> = {},
): Record<string, string> {
  const ctx = requestContext.getStore();
  if (ctx?.requestId) {
    headers['x-request-id'] = ctx.requestId;
  }
  return headers;
}
