import { BadRequestException } from '@nestjs/common';
import { parsePossiblyStringifiedJson } from 'src/helpers/customerCheck.helper';
import { PineLabsApiName } from 'src/modules/pine-labs/enums/pine-labs-api-name.enum';
import {
  PineLabsApiDefinition,
  PineLabsExecutorResult,
  PineLabsPayloadMapping,
} from 'src/modules/pine-labs/interfaces/pine-labs.interface';

const SENSITIVE_KEYS = new Set([
  'access_token',
  'accesstoken',
  'token',
  'authorization',
  'client_secret',
  'clientsecret',
  'password',
  'secret',
  'api_key',
  'apikey',
]);

const PII_KEYS = new Set(['email', 'mobile', 'phone', 'pan', 'aadhaar', 'ssn']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveTemplateValue(
  template: unknown,
  data: Record<string, unknown>,
): unknown {
  if (typeof template === 'string') {
    const placeholderMatch = template.match(/^\{\{(\w+)\}\}$/);
    if (placeholderMatch) {
      const field = placeholderMatch[1];
      if (!(field in data)) {
        throw new BadRequestException(
          `Missing required field "${field}" for Pine Labs payload mapping`,
        );
      }
      return data[field];
    }
    return template.replace(/\{\{(\w+)\}\}/g, (_match, field: string) => {
      if (!(field in data)) {
        throw new BadRequestException(
          `Missing required field "${field}" for Pine Labs payload mapping`,
        );
      }
      return String(data[field]);
    });
  }

  if (Array.isArray(template)) {
    return template.map((item) => resolveTemplateValue(item, data));
  }

  if (isPlainObject(template)) {
    return Object.fromEntries(
      Object.entries(template).map(([key, value]) => [
        key,
        resolveTemplateValue(value, data),
      ]),
    );
  }

  return template;
}

function assertRequiredFields(
  definition: PineLabsApiDefinition,
  data: Record<string, unknown>,
): void {
  for (const field of definition.requiredFields ?? []) {
    if (data[field] === undefined || data[field] === null) {
      throw new BadRequestException(
        `Missing required field "${field}" for Pine Labs API payload`,
      );
    }
  }

  if (definition.requiredOneOf?.length) {
    const hasOne = definition.requiredOneOf.some(
      (field) => data[field] !== undefined && data[field] !== null,
    );
    if (!hasOne) {
      const fieldsList = definition.requiredOneOf
        .map((field) => `"${field}"`)
        .join(', ');
      throw new BadRequestException(
        `Missing required field: at least one of ${fieldsList} must be provided for Pine Labs API payload`,
      );
    }
  }
}

export function mapPayload(
  definition: PineLabsApiDefinition,
  data: Record<string, unknown>,
): unknown {
  assertRequiredFields(definition, data);
  return mapPayloadFromMapping(definition.payloadMapping, data);
}

function mapPayloadFromMapping(
  mapping: PineLabsPayloadMapping,
  data: Record<string, unknown>,
): unknown {
  const entries = Object.entries(mapping);
  const hasTemplateValues = entries.some(
    ([, value]) =>
      typeof value === 'string' && value.includes('{{') && value.includes('}}'),
  );

  if (hasTemplateValues || entries.some(([, value]) => isPlainObject(value))) {
    return resolveTemplateValue(mapping, data);
  }

  const payload: Record<string, unknown> = {};
  for (const [callerKey, pineLabsKey] of entries) {
    if (typeof pineLabsKey !== 'string') {
      payload[callerKey] = resolveTemplateValue(pineLabsKey, data);
      continue;
    }
    if (
      !(callerKey in data) ||
      data[callerKey] === undefined ||
      data[callerKey] === null
    ) {
      continue;
    }
    payload[pineLabsKey] = data[callerKey];
  }
  return payload;
}

export function normalizePineLabsResponse(
  raw: unknown,
  apiName: PineLabsApiName,
  correlationId: string,
): PineLabsExecutorResult {
  const parsed = parsePossiblyStringifiedJson(raw);

  if (isPlainObject(parsed)) {
    const success =
      parsed.success !== false &&
      parsed.status !== 'error' &&
      parsed.error === undefined;

    if (!success) {
      return {
        success: false,
        apiName,
        correlationId,
        error: {
          code:
            typeof parsed.code === 'string'
              ? parsed.code
              : typeof parsed.error_code === 'string'
                ? parsed.error_code
                : undefined,
          message:
            typeof parsed.message === 'string'
              ? parsed.message
              : typeof parsed.error === 'string'
                ? parsed.error
                : 'Pine Labs API returned an error',
          statusCode:
            typeof parsed.statusCode === 'number'
              ? parsed.statusCode
              : typeof parsed.status_code === 'number'
                ? parsed.status_code
                : undefined,
        },
        data: parsed,
      };
    }

    return {
      success: true,
      apiName,
      correlationId,
      data: parsed.data ?? parsed,
    };
  }

  return {
    success: true,
    apiName,
    correlationId,
    data: parsed,
  };
}

export function sanitizeForLog(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map((item) => sanitizeForLog(item));
  }

  if (!isPlainObject(body)) {
    return body;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(normalizedKey) || PII_KEYS.has(normalizedKey)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    sanitized[key] = sanitizeForLog(value);
  }
  return sanitized;
}

export function buildNormalizedError(
  apiName: PineLabsApiName,
  correlationId: string,
  message: string,
  statusCode?: number,
  code?: string,
): PineLabsExecutorResult {
  return {
    success: false,
    apiName,
    correlationId,
    error: {
      message,
      statusCode,
      code,
    },
  };
}
