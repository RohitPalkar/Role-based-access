import { logger } from 'src/logger/logger';

export function removeCircularReferences(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }

  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => removeCircularReferences(item, seen));
  }

  const result: any = {};
  for (const key of Object.keys(obj)) {
    try {
      result[key] = removeCircularReferences(obj[key], seen);
    } catch (error) {
      logger.warn(`Failed to serialize key "${key}"`, error);
      result[key] = '[Error serializing]';
    }
  }

  return result;
}
